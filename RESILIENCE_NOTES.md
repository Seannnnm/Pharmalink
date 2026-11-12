# Resilience Notes (Week 11)

Our consumer side depends on our upstream partner: _fill in once that integration exists (same drill: slow, flaky, stopped)._

As a provider for the Strathmore Cafeteria: their retries reach us as at most 3 requests per page load, 200 ms and 400 ms apart, and only for GETs. Our 429 sends `Retry-After`, which their client honours, so a burst of their retries cannot run away against our 100/minute limit.
