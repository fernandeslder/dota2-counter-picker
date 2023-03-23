from apscheduler.schedulers.background import BackgroundScheduler
import services

scheduler = BackgroundScheduler()

# Schedule the sync_data function to run every 12 hours
scheduler.add_job(func=services.sync_data, trigger='interval', hours=12)
