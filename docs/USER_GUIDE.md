# Jocular Kangaroo User Guide

Welcome to the Jocular Kangaroo K-12 Intervention Tracking System. This guide will help you get started with the system and make the most of its features.

## Table of Contents

1. [Getting Started](#getting-started)
2. [User Roles](#user-roles)
3. [Student Management](#student-management)
4. [Intervention Management](#intervention-management)
5. [Document Management](#document-management)
6. [Reports and Analytics](#reports-and-analytics)
7. [Best Practices](#best-practices)

## Getting Started

### First Time Login

1. Navigate to your district's Jocular Kangaroo URL
2. Click "Sign In" 
3. Enter your email and temporary password
4. Follow prompts to set a new password
5. Complete your profile information

### Dashboard Overview

After logging in, you'll see the main dashboard with:
- Quick statistics (total students, active interventions, etc.)
- Quick action buttons
- Recent activity feed
- Navigation menu on the left

## User Roles

The system has five distinct roles with different permissions:

### Administrator
- Full system access
- User management
- System settings
- All intervention features
- Reports and analytics

### Teacher
- View and manage students
- Create and track interventions
- Upload documents
- View reports
- Access calendar

### Counselor
- All teacher permissions
- Manage intervention programs
- Extended reporting access
- Cross-student analytics

### Specialist
- Similar to counselor role
- Focus on specialized interventions
- Program template management

### Nurse
- Student health information
- Health-related interventions
- Limited to health categories

## Student Management

### Adding a New Student

1. Click "Students" in the navigation menu
2. Click "Add New Student" button
3. Fill in required information:
   - Student ID
   - First and Last Name
   - Grade Level
   - School
   - Date of Birth
4. Add optional information as needed
5. Click "Create Student"

### Searching for Students

Use the search bar to find students by:
- Name (first or last)
- Student ID
- Grade level

### Managing Student Records

From the student detail page, you can:
- View complete student profile
- See all interventions for the student
- Upload relevant documents
- Track intervention history
- Update student information

## Intervention Management

### Creating an Intervention

1. Navigate to student profile or click "Interventions" → "New Intervention"
2. Select the student (if not already selected)
3. Choose intervention type:
   - Academic
   - Behavioral
   - Social Emotional
   - Attendance
   - Health
   - Other
4. Select a program template (optional)
5. Fill in intervention details:
   - Title and description
   - Goals
   - Start date and end date
   - Frequency and duration
   - Location
   - Assigned staff member
6. Click "Create Intervention"

### Using Program Templates

Program templates help standardize common interventions:

1. When creating an intervention, select a program from the dropdown
2. The system will auto-fill:
   - Suggested duration
   - Standard goals
   - Required materials
   - Typical frequency
3. Customize as needed for the individual student

### Tracking Progress

#### Recording Sessions

1. Open the intervention detail page
2. Click "Add Session" in the Sessions tab
3. Record:
   - Date and duration
   - Attendance status
   - Progress notes
   - Challenges faced
   - Next steps
4. Save the session

#### Setting and Tracking Goals

1. In the Goals tab, click "Add Goal"
2. Enter:
   - Specific, measurable goal text
   - Target date
   - Success criteria
3. Mark goals as achieved when completed
4. Add evidence of achievement

### Managing Team Members

For collaborative interventions:
1. Go to the Team tab
2. Click "Add Team Member"
3. Select staff member and define their role
4. Team members can view and contribute to the intervention

### Intervention Statuses

- **Planned**: Scheduled to begin
- **In Progress**: Currently active
- **Completed**: Successfully finished
- **Discontinued**: Ended early
- **On Hold**: Temporarily paused

## Document Management

### Uploading Documents

1. Navigate to the intervention detail page
2. Click the "Documents" tab
3. Click "Upload Document"
4. Select file (PDF, Word, images supported)
5. Add optional description
6. Click "Upload"

### Document Security

- Documents are securely stored in AWS S3
- Only authorized users can access documents
- Download links expire after 5 minutes
- Maximum file size: 10MB

### Managing Documents

- Click the download icon to retrieve documents
- Click the trash icon to delete (if you uploaded it)
- Administrators can delete any document

## Reports and Analytics

### Available Reports

1. **Intervention Summary**
   - Overview of all active interventions
   - Breakdown by type and status
   - School-wide statistics

2. **Progress Reports**
   - Student achievement rates
   - Goal completion statistics
   - Intervention effectiveness

3. **Student Reports**
   - Individual intervention history
   - Progress over time
   - Document summary

4. **Custom Reports**
   - Filter by date range
   - Select specific metrics
   - Export options

### Generating Reports

1. Click "Reports" in navigation
2. Select report type
3. Choose filters:
   - Date range
   - School
   - Grade level
   - Intervention type
4. Click "Generate Report"
5. Export as PDF or Excel (coming soon)

## Best Practices

### Intervention Planning

1. **Set Clear Goals**: Make goals specific and measurable
2. **Regular Updates**: Record sessions promptly
3. **Document Everything**: Upload supporting materials
4. **Collaborate**: Add team members when appropriate
5. **Review Regularly**: Check progress weekly

### Data Entry Tips

1. **Be Consistent**: Use standard terminology
2. **Be Thorough**: Complete all relevant fields
3. **Be Timely**: Enter data soon after sessions
4. **Be Specific**: Include details in progress notes

### Privacy and Security

1. **Protect Student Data**: Never share login credentials
2. **Log Out**: Always sign out when finished
3. **Report Issues**: Contact admin for any security concerns
4. **Follow FERPA**: Maintain student confidentiality

## Common Tasks

### Ending an Intervention

1. Open the intervention
2. Click "Edit Intervention"
3. Change status to "Completed" or "Discontinued"
4. Add completion notes explaining outcomes
5. Save changes

### Transferring Students

When a student moves schools:
1. Go to student profile
2. Click "Edit Student"
3. Update school information
4. Change status if needed
5. Interventions remain in history

### Bulk Operations

For multiple updates:
1. Use the checkbox on listing pages
2. Select desired records
3. Choose bulk action (coming soon)

## Troubleshooting

### Can't Find a Student?
- Check spelling of name
- Try searching by student ID
- Verify the student is active
- Check grade level filter

### Can't Upload Documents?
- Verify file size is under 10MB
- Check file format is supported
- Ensure you have permission
- Try a different browser

### Missing Features?
- Check your user role permissions
- Contact administrator for access
- Some features may be role-specific

## Getting Help

### In-App Help
- Look for the help icon on each page
- Hover over fields for tooltips
- Check validation messages

### Support Contacts
- Technical issues: Contact your IT department
- Training needs: Contact your intervention coordinator
- Feature requests: Submit through the feedback form

## Keyboard Shortcuts

- `Ctrl/Cmd + K`: Quick search
- `Ctrl/Cmd + N`: New intervention
- `Esc`: Close dialogs
- `Tab`: Navigate between fields

## Mobile Usage

The system is fully responsive:
- All features work on tablets
- Core features available on phones
- Touch-optimized interface
- Offline capability (coming soon)

---

Remember: Consistent, thorough documentation leads to better intervention outcomes and helps demonstrate the impact of your work with students.