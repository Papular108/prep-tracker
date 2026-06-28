from django.db import models
from django.contrib.auth.models import User

# 1. Master Table for a Syllabus
class UserSyllabus(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="syllabi")
    syllabus_name = models.CharField(max_length=255)  
    estimated_exam_date = models.DateField(null=True, blank=True)
    exam_month_nepali = models.CharField(max_length=50, null=True, blank=True) 
    revision_buffer_months = models.IntegerField(default=2)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.syllabus_name

# 2. Subject Modules
class Module(models.Model):
    syllabus = models.ForeignKey(UserSyllabus, on_delete=models.CASCADE, related_name="modules")
    module_name = models.CharField(max_length=255)  
    weightage_marks = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    def __str__(self):
        return self.module_name

# 3. Chapters
class Chapter(models.Model):
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name="chapters")
    chapter_title = models.CharField(max_length=255) 

    def __str__(self):
        return self.chapter_title

# 4. Granular Sub-Topics
class SubTopic(models.Model):
    chapter = models.ForeignKey(Chapter, on_delete=models.CASCADE, related_name="sub_topics")
    topic_text = models.TextField()  
    is_completed = models.BooleanField(default=False)
    has_notes = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.chapter.chapter_title} -> {self.topic_text[:30]}"