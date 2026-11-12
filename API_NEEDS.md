1. Strathmore Cafeteria App needs to read a list of available medicine stock with real-time inventory levels from PharmaLink in order to display medication availability for online student orders[cite: 14, 51].
   - Freshness: Near real-time data
   - Volume: High frequency during peak ordering hours
   - Auth: Required

2. Strathmore Cafeteria App needs to search for specific essential medications in PharmaLink in order to help patients and students locate hard-to-find prescriptions quickly[cite: 14, 51].
   - Freshness: Updated within the hour
   - Volume: Moderate, called per search action
   - Auth: Required

3. Strathmore Cafeteria App needs to read store location details from PharmaLink in order to display pharmacy availability context alongside medical orders[cite: 14, 51].
   - Freshness: Static or updated daily
   - Volume: Low, accessed when viewing item details
   - Auth: Required

4. Strathmore Cafeteria App needs to read real-time stock levels for a specific medication ID from PharmaLink in order to block checkouts when local inventory is depleted[cite: 14, 51].
   - Freshness: Real-time during the checkout process
   - Volume: High during active checkouts
   - Auth: Required

What surprised us during the partner interviews was discovering that our medical inventory feature had to be tightly coupled with PharmaLink's live database rather than relying on a static local copy, making real-time stock verification during student checkouts a critical requirement to avoid unfulfilled medical orders[cite: 15, 52].