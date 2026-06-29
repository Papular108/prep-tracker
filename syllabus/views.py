from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.exceptions import PermissionDenied
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from datetime import timedelta, date
from collections import defaultdict
from math import ceil
import io, json, os, re
from .models import UserSyllabus, Module, Chapter, SubTopic, StudyLog
from .serializers import (UserSyllabusSerializer, UserRegisterSerializer,
                           ModuleWriteSerializer, ChapterWriteSerializer, SubTopicWriteSerializer,
                           StudyLogSerializer)

# 1. Simplified ViewSet for the entire Syllabus tree
class UserSyllabusViewSet(viewsets.ModelViewSet):
    serializer_class = UserSyllabusSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Only return the data belonging to the logged-in user
        return UserSyllabus.objects.filter(user=self.request.user).prefetch_related(
            'modules__chapters__sub_topics'
        )

    def perform_create(self, serializer):
        # Automatically assign the syllabus to the currently logged-in user
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'], url_path='analyze-pdf')
    def analyze_pdf(self, request):
        pdf_file = request.FILES.get('pdf')
        if not pdf_file:
            return Response({'error': 'No PDF file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        # Extract text from PDF
        import pdfplumber
        text = ''
        try:
            with pdfplumber.open(io.BytesIO(pdf_file.read())) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + '\n'
        except Exception as e:
            return Response({'error': f'Failed to read PDF: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

        if not text.strip():
            return Response({'error': 'Could not extract text from PDF.'}, status=status.HTTP_400_BAD_REQUEST)

        # Call Claude API
        import anthropic
        api_key = os.environ.get('ANTHROPIC_API_KEY')
        if not api_key:
            return Response({'error': 'ANTHROPIC_API_KEY not configured.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        client = anthropic.Anthropic(api_key=api_key)
        prompt = (
            'Analyze this syllabus document and extract the structure. '
            'Return ONLY valid JSON with this exact format, no other text:\n'
            '{\n'
            '  "syllabus_name": "...",\n'
            '  "modules": [\n'
            '    {\n'
            '      "module_name": "...",\n'
            '      "weightage_marks": null,\n'
            '      "chapters": [\n'
            '        {\n'
            '          "chapter_title": "...",\n'
            '          "subtopics": ["topic1", "topic2"]\n'
            '        }\n'
            '      ]\n'
            '    }\n'
            '  ]\n'
            '}\n\n'
            f'Syllabus document:\n{text[:12000]}'
        )

        try:
            message = client.messages.create(
                model='claude-sonnet-4-6',
                max_tokens=4096,
                messages=[{'role': 'user', 'content': prompt}],
            )
        except Exception as e:
            return Response({'error': f'AI analysis failed: {str(e)}'}, status=status.HTTP_502_BAD_GATEWAY)

        raw = message.content[0].text
        # Strip markdown code fences if present
        raw = re.sub(r'```(?:json)?\s*', '', raw)
        raw = re.sub(r'```', '', raw).strip()

        try:
            structure = json.loads(raw)
        except json.JSONDecodeError:
            match = re.search(r'\{[\s\S]*\}', raw)
            if match:
                try:
                    structure = json.loads(match.group())
                except json.JSONDecodeError:
                    return Response({'error': 'AI returned malformed JSON.'}, status=status.HTTP_502_BAD_GATEWAY)
            else:
                return Response({'error': 'AI returned malformed JSON.'}, status=status.HTTP_502_BAD_GATEWAY)

        return Response(structure)

    @action(detail=False, methods=['post'], url_path='import-pdf')
    def import_pdf(self, request):
        data = request.data
        syllabus_name = data.get('syllabus_name') or 'Imported Syllabus'
        modules_data = data.get('modules', [])

        if not modules_data:
            return Response({'error': 'No syllabus structure provided.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            syllabus = UserSyllabus.objects.create(
                user=request.user,
                syllabus_name=syllabus_name,
            )
            for mod in modules_data:
                module = Module.objects.create(
                    syllabus=syllabus,
                    module_name=mod.get('module_name') or 'Module',
                    weightage_marks=mod.get('weightage_marks'),
                )
                for ch in mod.get('chapters', []):
                    chapter = Chapter.objects.create(
                        module=module,
                        chapter_title=ch.get('chapter_title') or 'Chapter',
                    )
                    for topic_text in ch.get('subtopics', []):
                        SubTopic.objects.create(chapter=chapter, topic_text=topic_text)

        syllabus.refresh_from_db()
        serializer = UserSyllabusSerializer(
            UserSyllabus.objects.prefetch_related('modules__chapters__sub_topics').get(pk=syllabus.pk)
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='study-plan')
    def study_plan(self, request, pk=None):
        syllabus = self.get_object()

        if not syllabus.estimated_exam_date:
            return Response({'error': 'No exam date set for this syllabus.'}, status=status.HTTP_400_BAD_REQUEST)

        today = date.today()
        exam_date = syllabus.estimated_exam_date
        buffer_days = (syllabus.revision_buffer_months or 0) * 30
        study_end = exam_date - timedelta(days=buffer_days)

        if study_end <= today:
            return Response({'error': 'Study period has ended — you are in revision phase or past the exam date.'}, status=status.HTTP_400_BAD_REQUEST)

        subtopics = list(
            SubTopic.objects.filter(
                chapter__module__syllabus=syllabus,
                is_completed=False,
            ).select_related('chapter', 'chapter__module').order_by(
                'chapter__module__id', 'chapter__id', 'id'
            )
        )

        total = len(subtopics)
        days_available = (study_end - today).days
        per_day = ceil(total / days_available) if total > 0 else 0

        # Distribute subtopics day by day
        plan_days = []
        idx = 0
        current_date = today
        while current_date < study_end:
            batch = subtopics[idx:idx + per_day] if idx < total else []
            if batch:
                plan_days.append({
                    'date': current_date.isoformat(),
                    'subtopics': [
                        {
                            'id': st.id,
                            'topic_text': st.topic_text,
                            'chapter_title': st.chapter.chapter_title,
                            'module_name': st.chapter.module.module_name,
                            'is_completed': st.is_completed,
                        }
                        for st in batch
                    ]
                })
            idx += per_day if per_day else 1
            current_date += timedelta(days=1)
            if idx >= total:
                break

        # Group by week (Monday-anchored)
        weeks = []
        current_week = None
        for day in plan_days:
            d = date.fromisoformat(day['date'])
            week_start = d - timedelta(days=d.weekday())
            week_end = week_start + timedelta(days=6)
            week_key = week_start.isoformat()
            if current_week is None or current_week['week_start'] != week_key:
                current_week = {
                    'week_start': week_key,
                    'week_label': f"{week_start.strftime('%b %d')} \u2013 {week_end.strftime('%b %d, %Y')}",
                    'days': [],
                }
                weeks.append(current_week)
            current_week['days'].append(day)

        return Response({
            'summary': {
                'total_subtopics': total,
                'study_days': days_available,
                'per_day': per_day,
                'revision_start': study_end.isoformat(),
                'exam_date': exam_date.isoformat(),
            },
            'weeks': weeks,
        })

    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        syllabus = self.get_object()
        total = 0
        completed = 0
        modules_data = []
        for module in syllabus.modules.all():
            mod_total = 0
            mod_completed = 0
            for chapter in module.chapters.all():
                subtopics = chapter.sub_topics.all()
                mod_total += subtopics.count()
                mod_completed += subtopics.filter(is_completed=True).count()
            total += mod_total
            completed += mod_completed
            mod_pct = round((mod_completed / mod_total) * 100) if mod_total > 0 else 0
            modules_data.append({
                'id': module.id,
                'name': module.module_name,
                'total_subtopics': mod_total,
                'completed_subtopics': mod_completed,
                'percentage': mod_pct,
            })
        pct = round((completed / total) * 100) if total > 0 else 0
        return Response({
            'total_subtopics': total,
            'completed_subtopics': completed,
            'percentage': pct,
            'modules': modules_data,
        })

# 2. Module ViewSet
class ModuleViewSet(viewsets.ModelViewSet):
    serializer_class = ModuleWriteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Module.objects.filter(syllabus__user=self.request.user)

    def perform_create(self, serializer):
        syllabus = serializer.validated_data['syllabus']
        if syllabus.user != self.request.user:
            raise PermissionDenied
        serializer.save()

# 3. Chapter ViewSet
class ChapterViewSet(viewsets.ModelViewSet):
    serializer_class = ChapterWriteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Chapter.objects.filter(module__syllabus__user=self.request.user)

    def perform_create(self, serializer):
        module = serializer.validated_data['module']
        if module.syllabus.user != self.request.user:
            raise PermissionDenied
        serializer.save()

# 4. SubTopic ViewSet
class SubTopicViewSet(viewsets.ModelViewSet):
    serializer_class = SubTopicWriteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SubTopic.objects.filter(chapter__module__syllabus__user=self.request.user)

    def perform_create(self, serializer):
        chapter = serializer.validated_data['chapter']
        if chapter.module.syllabus.user != self.request.user:
            raise PermissionDenied
        serializer.save()

# 5. StudyLog ViewSet
class StudyLogViewSet(viewsets.ModelViewSet):
    serializer_class = StudyLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return StudyLog.objects.filter(user=self.request.user).order_by('-date', '-created_at')

    def perform_create(self, serializer):
        syllabus = serializer.validated_data['syllabus']
        if syllabus.user != self.request.user:
            raise PermissionDenied
        subtopic = serializer.validated_data.get('subtopic')
        if subtopic and subtopic.chapter.module.syllabus.user != self.request.user:
            raise PermissionDenied
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        qs = StudyLog.objects.filter(user=request.user)
        today = timezone.localdate()

        # 1. daily_hours: last 90 days
        start_90 = today - timedelta(days=89)
        daily_qs = (
            qs.filter(date__gte=start_90)
            .values('date')
            .annotate(hours=Sum('hours_spent'))
        )
        daily_map = {row['date']: float(row['hours']) for row in daily_qs}
        daily_hours = []
        for i in range(90):
            d = start_90 + timedelta(days=i)
            daily_hours.append({'date': d.isoformat(), 'hours': daily_map.get(d, 0)})

        # 2. hours_by_syllabus
        syl_qs = (
            qs.values('syllabus__syllabus_name')
            .annotate(total_hours=Sum('hours_spent'))
            .order_by('-total_hours')
        )
        hours_by_syllabus = [
            {'syllabus_name': row['syllabus__syllabus_name'], 'total_hours': float(row['total_hours'])}
            for row in syl_qs
        ]

        # 3. completion_by_module
        syllabi = UserSyllabus.objects.filter(user=request.user).prefetch_related(
            'modules__chapters__sub_topics'
        )
        completion_by_module = []
        for syl in syllabi:
            for module in syl.modules.all():
                total = 0
                completed = 0
                for chapter in module.chapters.all():
                    sts = chapter.sub_topics.all()
                    total += sts.count()
                    completed += sts.filter(is_completed=True).count()
                pct = round((completed / total) * 100) if total > 0 else 0
                completion_by_module.append({
                    'module_name': module.module_name,
                    'syllabus_name': syl.syllabus_name,
                    'completed': completed,
                    'total': total,
                    'percentage': pct,
                })

        # 4. weekly_totals: last 12 weeks (Monday-anchored)
        week_start_of_today = today - timedelta(days=today.weekday())
        start_12w = week_start_of_today - timedelta(weeks=11)
        weekly_map = defaultdict(float)
        for row in qs.filter(date__gte=start_12w).values('date').annotate(hours=Sum('hours_spent')):
            d = row['date']
            week_monday = d - timedelta(days=d.weekday())
            weekly_map[week_monday] += float(row['hours'])

        weekly_totals = []
        for i in range(12):
            wk = start_12w + timedelta(weeks=i)
            weekly_totals.append({
                'week_label': wk.strftime('%b %d'),
                'hours': round(weekly_map.get(wk, 0), 2),
            })

        return Response({
            'daily_hours': daily_hours,
            'hours_by_syllabus': hours_by_syllabus,
            'completion_by_module': completion_by_module,
            'weekly_totals': weekly_totals,
        })

    @action(detail=False, methods=['get'])
    def summary(self, request):
        qs = StudyLog.objects.filter(user=request.user)
        today = timezone.localdate()
        week_start = today - timedelta(days=today.weekday())

        total_hours = qs.aggregate(total=Sum('hours_spent'))['total'] or 0
        today_hours = qs.filter(date=today).aggregate(total=Sum('hours_spent'))['total'] or 0
        this_week_hours = qs.filter(date__gte=week_start).aggregate(total=Sum('hours_spent'))['total'] or 0

        # Streak: consecutive days ending today (or yesterday)
        dates = set(qs.values_list('date', flat=True))
        streak = 0
        current = today
        while current in dates:
            streak += 1
            current -= timedelta(days=1)
        if streak == 0:
            current = today - timedelta(days=1)
            while current in dates:
                streak += 1
                current -= timedelta(days=1)

        return Response({
            'total_hours': float(total_hours),
            'today_hours': float(today_hours),
            'this_week_hours': float(this_week_hours),
            'streak': streak,
        })

# 6. Registration View (Kept as is)
class RegisterView(APIView):
    permission_classes = [AllowAny] 
    serializer_class = UserRegisterSerializer

    def get(self, request):
        serializer = UserRegisterSerializer()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "User created successfully!"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)