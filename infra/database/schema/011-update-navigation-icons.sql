-- Migration: Update navigation icons to better match their purposes
-- This migration updates the navigation_items table with more appropriate icons

-- Students: Changed from generic Users to SchoolBell (more education-focused)
UPDATE navigation_items
SET icon = 'IconSchoolBell'
WHERE label = 'Students' AND is_active = true;

-- Interventions: Changed to FirstAidKit (better represents intervention/support)
UPDATE navigation_items
SET icon = 'IconFirstAidKit'
WHERE label = 'Interventions' AND is_active = true;

-- Reports: Changed to ChartPie (better represents analytics/reporting)
UPDATE navigation_items
SET icon = 'IconChartPie'
WHERE label = 'Reports' AND is_active = true;

-- Programs: Changed to Book (better represents academic programs)
UPDATE navigation_items
SET icon = 'IconBook'
WHERE label = 'Programs' AND is_active = true;

-- Calendar: Changed to CalendarEvent (more specific than generic Calendar)
UPDATE navigation_items
SET icon = 'IconCalendarEvent'
WHERE label = 'Calendar' AND is_active = true;

-- Schools: Changed to Building (better represents school buildings)
UPDATE navigation_items
SET icon = 'IconBuilding'
WHERE label = 'Schools' AND is_active = true;

-- Settings: Changed to Adjustments (more universally recognized settings icon)
UPDATE navigation_items
SET icon = 'IconAdjustments'
WHERE label = 'Settings' AND is_active = true;

-- Users: Keep as Users but ensure consistency
UPDATE navigation_items
SET icon = 'IconUsers'
WHERE label = 'Users' AND is_active = true;