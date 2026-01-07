from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('rainfallApi', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='rainfall',
            name='latitude',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='rainfall',
            name='longitude',
            field=models.FloatField(blank=True, null=True),
        ),
    ]
