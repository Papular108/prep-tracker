from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.exceptions import PermissionDenied
from .models import UserSyllabus, Module, Chapter, SubTopic
from .serializers import (UserSyllabusSerializer, UserRegisterSerializer,
                           ModuleWriteSerializer, ChapterWriteSerializer, SubTopicWriteSerializer)

# 1. Simplified ViewSet for the entire Syllabus tree
class UserSyllabusViewSet(viewsets.ModelViewSet):
    serializer_class = UserSyllabusSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Only return the data belonging to the logged-in user
        return UserSyllabus.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # Automatically assign the syllabus to the currently logged-in user
        serializer.save(user=self.request.user)

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

# 5. Registration View (Kept as is)
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