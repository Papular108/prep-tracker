from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserSyllabusViewSet, RegisterView, ModuleViewSet, ChapterViewSet, SubTopicViewSet, StudyLogViewSet

router = DefaultRouter()
router.register(r'syllabus', UserSyllabusViewSet, basename='syllabus')
router.register(r'modules', ModuleViewSet, basename='module')
router.register(r'chapters', ChapterViewSet, basename='chapter')
router.register(r'subtopics', SubTopicViewSet, basename='subtopic')
router.register(r'studylogs', StudyLogViewSet, basename='studylog')

urlpatterns = [
    path('', include(router.urls)),
    path('register/', RegisterView.as_view(), name='register'),
]