from rest_framework import serializers
from django.contrib.auth.models import User
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
    class Meta:
        model = UserSyllabus
        fields = '__all__'
        read_only_fields = ['user']

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