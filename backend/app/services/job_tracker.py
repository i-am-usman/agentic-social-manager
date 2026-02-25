"""
Job tracking system for long-running publish operations.
Tracks progress of social media publishing jobs.
"""
import uuid
from typing import Dict, Optional
from datetime import datetime
from threading import Lock

class JobTracker:
    """
    In-memory job tracking system.
    Stores job status, progress, and results.
    """
    
    def __init__(self):
        self.jobs: Dict[str, dict] = {}
        self.lock = Lock()
    
    def create_job(self, user_id: str) -> str:
        """Create a new job and return its ID"""
        job_id = str(uuid.uuid4())
        
        with self.lock:
            self.jobs[job_id] = {
                "job_id": job_id,
                "user_id": user_id,
                "status": "starting",
                "progress": 0,
                "message": "Initializing...",
                "platforms": {},
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "result": None,
                "error": None
            }
        
        return job_id
    
    def update_job(self, job_id: str, status: Optional[str] = None, 
                   progress: Optional[int] = None, message: Optional[str] = None,
                   platform_status: Optional[Dict[str, str]] = None):
        """Update job status and progress"""
        with self.lock:
            if job_id not in self.jobs:
                return
            
            job = self.jobs[job_id]
            
            if status:
                job["status"] = status
            if progress is not None:
                job["progress"] = progress
            if message:
                job["message"] = message
            if platform_status:
                job["platforms"].update(platform_status)
            
            job["updated_at"] = datetime.utcnow().isoformat()
    
    def complete_job(self, job_id: str, result: dict):
        """Mark job as completed with result"""
        with self.lock:
            if job_id not in self.jobs:
                return
            
            job = self.jobs[job_id]
            job["status"] = "completed"
            job["progress"] = 100
            job["message"] = "Publishing completed"
            job["result"] = result
            job["updated_at"] = datetime.utcnow().isoformat()
    
    def fail_job(self, job_id: str, error: str):
        """Mark job as failed with error"""
        with self.lock:
            if job_id not in self.jobs:
                return
            
            job = self.jobs[job_id]
            job["status"] = "failed"
            job["message"] = "Publishing failed"
            job["error"] = error
            job["updated_at"] = datetime.utcnow().isoformat()
    
    def get_job(self, job_id: str) -> Optional[dict]:
        """Get job status"""
        with self.lock:
            return self.jobs.get(job_id)
    
    def cleanup_old_jobs(self, max_age_minutes: int = 60):
        """Remove jobs older than specified minutes"""
        with self.lock:
            current_time = datetime.utcnow()
            jobs_to_remove = []
            
            for job_id, job in self.jobs.items():
                created_at = datetime.fromisoformat(job["created_at"])
                age_minutes = (current_time - created_at).total_seconds() / 60
                
                if age_minutes > max_age_minutes:
                    jobs_to_remove.append(job_id)
            
            for job_id in jobs_to_remove:
                del self.jobs[job_id]


# Global job tracker instance
job_tracker = JobTracker()
