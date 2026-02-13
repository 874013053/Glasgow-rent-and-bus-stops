Glasgow Rental Prices & Bus Accessibility (2019–2023)

🔗 Live Web Map: https://874013053.github.io/Glasgow-rent-and-bus-stops/

1.Project Overview
This interactive web map visualises quarterly rental prices in Glasgow (2019–2023) at ward level, with an additional layer showing bus stop locations to explore potential spatial relationships between housing costs and transport accessibility.

The project aims to help users:
Explore how rental prices vary spatially across Glasgow
Compare different bedroom categories (1-bed, 2-bed, 3-bed)
Examine temporal changes using quarterly data
Consider how public transport infrastructure relates to rental distribution
The map is designed for students, renters, researchers, and planners interested in urban housing patterns and accessibility.

2.Data Sources
Rental data (2019–2023, quarterly)
Aggregated at ward level, including:
Median rent
Mean rent
Count of listings
Minimum and maximum values
Bedroom category
Glasgow Ward Boundaries
Used for choropleth visualisation.

Bus Stop Locations
Displayed as point features to represent transport accessibility.
All datasets were processed and uploaded as Mapbox tilesets for web visualisation.

3.Technologies Used
Mapbox Studio – Style design & choropleth classification
Mapbox GL JS (v3.6.0) – Interactive web mapping
HTML / CSS / JavaScript – UI and interaction logic
GitHub Pages – Hosting and public deployment

4.Interactive Features
The web map includes the following key interactive components:
（1）Ward Hover Highlight
When the user moves the mouse over a ward, its boundary is highlighted to improve spatial readability.
（2）Ward Click Popup
Clicking a ward displays detailed rental statistics:
Bedroom category
Quarter
Median rent
Mean rent
Listing count
Minimum–maximum values
（3）Quarter Slider (2019 Q1 – 2023 Q4)
Users can dynamically filter the map by selecting a specific quarter using a slider interface.
（4）Bedroom Multi-Select Filter
Users can filter by:
1 bed
2 bed
3 bed
Multiple selections are supported.
（5）Bus Stops Visibility Toggle
A button allows users to show/hide bus stop locations to explore spatial relationships with rental prices.
（6 ）Reset View Button
Returns the map to the default Glasgow centre and zoom level.
（7） Legend Toggle
Users can show/hide the legend panel for better map readability.

5.Data Processing Workflow
Rental data filtered to include only 2019–2023.
Aggregated by:
Ward
Quarter
Bedroom category
Cleaned and standardised attribute fields (e.g. YEARLY_QUARTER, BEDROOMS).
Uploaded as a vector tileset to Mapbox Studio.
Styled as a choropleth map based on median rental price.

6.Map Design Choices
Choropleth classification based on median rent
Sequential colour scheme to reflect increasing rental cost
Clean basemap to prioritise thematic data
Interactive filtering to support exploratory analysis
Hover outlines to enhance spatial focus

7.Limitations
Rental data reflects listings rather than final transaction prices.
Ward-level aggregation may mask intra-ward variation.
Bus stop presence does not measure service frequency or quality.
No statistical analysis is performed — the map supports visual exploration only.

8.Future Improvements
Add dynamic charts linked to map selection
Introduce search functionality by ward name
Include additional accessibility indicators (e.g. train stations)
Improve mobile responsiveness
Add accessibility-friendly colour schemes

Author
Yan Wang
GEOG5015 – Interactive Web Mapping
University of Glasgow
