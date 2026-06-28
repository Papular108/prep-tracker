from django.contrib import admin
from .models import UserSyllabus, Module, Chapter, SubTopic

# Register your models here so they appear in the Admin Dashboard
admin.site.register(UserSyllabus)
admin.site.register(Module)
admin.site.register(Chapter)
admin.site.register(SubTopic)