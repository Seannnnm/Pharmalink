[Consumer Team Name] needs to read the stock quantity of a specific medicine in order to confirm availability before allowing a user to proceed to checkout.
Freshness: Real-time (inventory fluctuates rapidly).
Volume: High (called on every search page load).
Auth: None required for read-only public stock checks.

[Consumer Team Name] needs to create a reservation in order to secure a specific medication at a chosen pharmacy for in-person pickup.
Freshness: Real-time (must lock the inventory immediately).
Volume: Moderate (only triggers when a user finalizes a selection).
Auth: Yes (requires patient initials and potentially session/payment validation).

[Consumer Team Name] needs to read a pharmacy's geographic location and contact details in order to plot the store on a map and enable the 'Call' and 'Directions' buttons.
Freshness: Low (store hours and locations change infrequently; daily is fine).
Volume: Moderate (called when loading the map view or pharmacy detail card).
Auth: None required for public business information.

[Consumer Team Name] needs to read the price of a medication across multiple pharmacies in order to render a 'lowest price' sorting filter and comparison widget.
Freshness: Updated within the hour.
Volume: High (called alongside the initial search query).g
Auth: None required.