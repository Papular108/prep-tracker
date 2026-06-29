from rest_framework import serializers
from django.contrib.auth.models import User
from django.utils import timezone
from .models import UserSyllabus, Module, Chapter, SubTopic, StudyLog

# 1. User Registration Serializer
class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password']
        )
        return user

# 2. SubTopic Serializer
class SubTopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubTopic
        fields = '__all__'

# 3. Chapter Serializer
class ChapterSerializer(serializers.ModelSerializer):
    sub_topics = SubTopicSerializer(many=True, read_only=True)
    class Meta:
        model = Chapter
        fields = '__all__'

# 4. Module Serializer
class ModuleSerializer(serializers.ModelSerializer):
    chapters = ChapterSerializer(many=True, read_only=True)
    class Meta:
        model = Module
        fields = '__all__'

# 5. UserSyllabus Serializer
class UserSyllabusSerializer(serializers.ModelSerializer):
    modules = ModuleSerializer(many=True, read_only=True)
    days_remaining = serializers.SerializerMethodField()
    total_days = serializers.SerializerMethodField()
    days_elapsed = serializers.SerializerMethodField()
    pace_status = serializers.SerializerMethodField()
    required_daily_subtopics = serializers.SerializerMethodField()

    class Meta:
        model = UserSyllabus
        fields = '__all__'
        read_only_fields = ['user']

    def _subtopic_counts(self, obj):
        total = completed = 0
        for mod in obj.modules.all():
            for ch in mod.chapters.all():
                for st in ch.sub_topics.all():
                    total += 1
                    if st.is_completed:
                        completed += 1
        return total, completed

    def get_days_remaining(self, obj):
        if not obj.estimated_exam_date:
            return None
        return (obj.estimated_exam_date - timezone.localdate()).days

    def get_total_days(self, obj):
        if not obj.estimated_exam_date:
            return None
        return (obj.estimated_exam_date - obj.created_at.date()).days

    def get_days_elapsed(self, obj):
        if not obj.estimated_exam_date:
            return None
        return (timezone.localdate() - obj.created_at.date()).days

    def get_pace_status(self, obj):
        if not obj.estimated_exam_date:
            return None
        total_days = (obj.estimated_exam_date - obj.created_at.date()).days
        if total_days <= 0:
            return None
        days_elapsed = (timezone.localdate() - obj.created_at.date()).days
        time_pct = min(days_elapsed / total_days * 100, 100)
        total, completed = self._subtopic_counts(obj)
        completion_pct = (completed / total * 100) if total > 0 else 0
        if completion_pct >= time_pct + 5:
            return 'ahead'
        elif completion_pct >= time_pct - 5:
            return 'on_track'
        else:
            return 'behind'

    def get_required_daily_subtopics(self, obj):
        if not obj.estimated_exam_date:
            return None
        days_remaining = (obj.estimated_exam_date - timezone.localdate()).days
        if days_remaining <= 0:
            return None
        total, completed = self._subtopic_counts(obj)
        remaining = total - completed
        if remaining <= 0:
            return 0
        return round(remaining / days_remaining, 1)

# Write serializers (flat — FK + writable fields only)
class ModuleWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Module
        fields = ['id', 'syllabus', 'module_name', 'weightage_marks']

class ChapterWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chapter
        fields = ['id', 'module', 'chapter_title']

class SubTopicWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubTopic
        fields = ['id', 'chapter', 'topic_text', 'is_completed', 'has_notes']

class StudyLogSerializer(serializers.ModelSerializer):
    subtopic_text = serializers.CharField(source='subtopic.topic_text', read_only=True, default=None)
    syllabus_name = serializers.CharField(source='syllabus.syllabus_name', read_only=True)

    class Meta:
        model = StudyLog
        fields = ['id', 'user', 'syllabus', 'syllabus_name', 'subtopic', 'subtopic_text', 'date', 'hours_spent', 'notes', 'created_at']
        read_only_fields = ['user', 'created_at']