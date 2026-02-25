from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('locationApi', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Piezometer',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('piezometer_name', models.CharField(blank=True, max_length=255, null=True)),
                ('water_level_depth', models.FloatField(blank=True, help_text='Depth to water level in meters', null=True)),
                ('date', models.DateField(db_index=True)),
                ('latitude', models.FloatField(blank=True, null=True)),
                ('longitude', models.FloatField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('village', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='piezometers', to='locationApi.village')),
            ],
            options={
                'ordering': ['-date'],
                'unique_together': {('village', 'date', 'piezometer_name')},
            },
        ),
    ]
