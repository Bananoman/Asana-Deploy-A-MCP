# Asana API - Complete Endpoint Specification

## Total Resources: 38

### Current Implementation Status

#### ✅ Implemented (8 resources, 19 tools)
1. **Workspaces** (3 tools)
2. **Projects** (3 tools)
3. **Tasks** (4 tools)
4. **Sections** (2 tools)
5. **Users** (2 tools)
6. **Goals** (2 tools)
7. **Portfolios** (2 tools)
8. **Custom Fields** (1 tool)

#### ❌ Missing (30 resources, ~90+ tools needed)

### 1. Tasks ✅ (Partial)
Current: 4/12+ tools
- ✅ GET /tasks
- ✅ POST /tasks
- ✅ GET /tasks/{task_gid}
- ✅ PUT /tasks/{task_gid}
- ❌ DELETE /tasks/{task_gid}
- ❌ POST /tasks/{task_gid}/duplicate
- ❌ GET /tasks/{task_gid}/subtasks
- ❌ POST /tasks/{task_gid}/subtasks
- ❌ POST /tasks/{task_gid}/setParent
- ❌ GET /tasks/{task_gid}/dependencies
- ❌ POST /tasks/{task_gid}/addDependencies
- ❌ POST /tasks/{task_gid}/removeDependencies
- ❌ GET /tasks/{task_gid}/dependents
- ❌ POST /tasks/{task_gid}/addDependents
- ❌ POST /tasks/{task_gid}/removeDependents

### 2. Attachments ❌
Tools needed: 5
- ❌ GET /attachments/{attachment_gid}
- ❌ DELETE /attachments/{attachment_gid}
- ❌ GET /attachments (for object)
- ❌ POST /attachments (upload)
- ❌ GET /tasks/{task_gid}/attachments

### 3. Stories (Comments) ❌
Tools needed: 5
- ❌ GET /stories/{story_gid}
- ❌ PUT /stories/{story_gid}
- ❌ DELETE /stories/{story_gid}
- ❌ GET /tasks/{task_gid}/stories
- ❌ POST /tasks/{task_gid}/stories

### 4. Tags ❌
Tools needed: 6
- ❌ GET /tags
- ❌ POST /tags
- ❌ GET /tags/{tag_gid}
- ❌ PUT /tags/{tag_gid}
- ❌ DELETE /tags/{tag_gid}
- ❌ GET /workspaces/{workspace_gid}/tags

### 5. Teams ❌ (Missing tools)
Current: 0/6+ tools
- ❌ GET /teams
- ❌ GET /teams/{team_gid}
- ❌ GET /organizations/{workspace_gid}/teams
- ❌ POST /teams/{team_gid}/addUser
- ❌ POST /teams/{team_gid}/removeUser
- ❌ GET /teams/{team_gid}/users

### 6. Team Memberships ❌
Tools needed: 4
- ❌ GET /team_memberships
- ❌ GET /team_memberships/{team_membership_gid}
- ❌ GET /teams/{team_gid}/team_memberships
- ❌ GET /users/{user_gid}/team_memberships

### 7. Workspaces ✅ (Partial)
Current: 3/5+ tools
- ✅ GET /workspaces
- ✅ GET /workspaces/{workspace_gid}
- ✅ PUT /workspaces/{workspace_gid}
- ❌ POST /workspaces/{workspace_gid}/addUser
- ❌ POST /workspaces/{workspace_gid}/removeUser

### 8. Workspace Memberships ❌
Tools needed: 3
- ❌ GET /workspace_memberships
- ❌ GET /workspace_memberships/{workspace_membership_gid}
- ❌ GET /workspaces/{workspace_gid}/workspace_memberships

### 9. Projects ✅ (Partial)
Current: 3/10+ tools
- ✅ GET /projects
- ✅ POST /projects
- ✅ GET /projects/{project_gid}
- ✅ PUT /projects/{project_gid}
- ❌ DELETE /projects/{project_gid}
- ❌ POST /projects/{project_gid}/duplicate
- ❌ POST /projects/{project_gid}/addCustomFieldSetting
- ❌ POST /projects/{project_gid}/removeCustomFieldSetting
- ❌ POST /projects/{project_gid}/addFollowers
- ❌ POST /projects/{project_gid}/removeFollowers

### 10. Project Memberships ❌
Tools needed: 4
- ❌ GET /project_memberships
- ❌ GET /project_memberships/{project_membership_gid}
- ❌ GET /projects/{project_gid}/project_memberships
- ❌ POST /projects/{project_gid}/addMembers

### 11. Project Briefs ❌
Tools needed: 4
- ❌ GET /project_briefs/{project_brief_gid}
- ❌ PUT /project_briefs/{project_brief_gid}
- ❌ DELETE /project_briefs/{project_brief_gid}
- ❌ POST /projects/{project_gid}/project_briefs

### 12. Project Statuses ❌
Tools needed: 4
- ❌ GET /project_statuses/{project_status_gid}
- ❌ DELETE /project_statuses/{project_status_gid}
- ❌ GET /projects/{project_gid}/project_statuses
- ❌ POST /projects/{project_gid}/project_statuses

### 13. Sections ✅ (Partial)
Current: 2/6+ tools
- ❌ GET /sections/{section_gid}
- ✅ PUT /sections/{section_gid} (via create with project_gid)
- ❌ DELETE /sections/{section_gid}
- ❌ GET /projects/{project_gid}/sections
- ✅ POST /projects/{project_gid}/sections
- ❌ POST /sections/{section_gid}/addTask
- ❌ POST /projects/{project_gid}/sections/insert

### 14. Status Updates ❌
Tools needed: 5
- ❌ GET /status_updates/{status_update_gid}
- ❌ DELETE /status_updates/{status_update_gid}
- ❌ POST /status_updates
- ❌ GET /projects/{project_gid}/status_updates
- ❌ GET /portfolios/{portfolio_gid}/status_updates

### 15. Portfolios ✅ (Partial)
Current: 2/8+ tools
- ✅ GET /portfolios
- ✅ GET /portfolios/{portfolio_gid}
- ❌ POST /portfolios
- ❌ PUT /portfolios/{portfolio_gid}
- ❌ DELETE /portfolios/{portfolio_gid}
- ❌ POST /portfolios/{portfolio_gid}/addItem
- ❌ POST /portfolios/{portfolio_gid}/removeItem
- ❌ POST /portfolios/{portfolio_gid}/addMembers

### 16. Portfolio Memberships ❌
Tools needed: 4
- ❌ GET /portfolio_memberships
- ❌ GET /portfolio_memberships/{portfolio_membership_gid}
- ❌ GET /portfolios/{portfolio_gid}/portfolio_memberships
- ❌ POST /portfolios/{portfolio_gid}/addMembers

### 17. Goals ✅ (Partial)
Current: 2/10+ tools
- ✅ GET /goals
- ✅ GET /goals/{goal_gid}
- ❌ POST /goals
- ❌ PUT /goals/{goal_gid}
- ❌ DELETE /goals/{goal_gid}
- ❌ POST /goals/{goal_gid}/addFollowers
- ❌ POST /goals/{goal_gid}/removeFollowers
- ❌ POST /goals/{goal_gid}/addSupportingRelationship
- ❌ POST /goals/{goal_gid}/removeSupportingRelationship
- ❌ GET /goals/{goal_gid}/parentGoals

### 18. Goal Relationships ❌
Tools needed: 4
- ❌ GET /goal_relationships/{goal_relationship_gid}
- ❌ PUT /goal_relationships/{goal_relationship_gid}
- ❌ GET /goals/{goal_gid}/goal_relationships
- ❌ POST /goals/{goal_gid}/goal_relationships

### 19. Custom Fields ✅ (Partial)
Current: 1/7+ tools
- ✅ GET /custom_fields (for workspace)
- ❌ GET /custom_fields/{custom_field_gid}
- ❌ POST /custom_fields
- ❌ PUT /custom_fields/{custom_field_gid}
- ❌ DELETE /custom_fields/{custom_field_gid}
- ❌ POST /custom_fields/{custom_field_gid}/enum_options
- ❌ PUT /custom_fields/{custom_field_gid}/enum_options/reorder

### 20. Custom Field Settings ❌
Tools needed: 3
- ❌ GET /custom_field_settings/{custom_field_setting_gid}
- ❌ GET /projects/{project_gid}/custom_field_settings
- ❌ GET /portfolios/{portfolio_gid}/custom_field_settings

### 21. Webhooks ❌
Tools needed: 5
- ❌ GET /webhooks
- ❌ POST /webhooks
- ❌ GET /webhooks/{webhook_gid}
- ❌ PUT /webhooks/{webhook_gid}
- ❌ DELETE /webhooks/{webhook_gid}

### 22. Events ❌
Tools needed: 1
- ❌ GET /events

### 23. Batch API ❌
Tools needed: 1
- ❌ POST /batch

### 24. Time Tracking Entries ❌
Tools needed: 6
- ❌ GET /time_tracking_entries/{time_tracking_entry_gid}
- ❌ PUT /time_tracking_entries/{time_tracking_entry_gid}
- ❌ DELETE /time_tracking_entries/{time_tracking_entry_gid}
- ❌ GET /tasks/{task_gid}/time_tracking_entries
- ❌ POST /tasks/{task_gid}/time_tracking_entries
- ❌ POST /time_tracking_entries

### 25. Time Periods ❌
Tools needed: 3
- ❌ GET /time_periods/{time_period_gid}
- ❌ GET /workspaces/{workspace_gid}/time_periods

### 26. User Task Lists ❌
Tools needed: 3
- ❌ GET /user_task_lists/{user_task_list_gid}
- ❌ GET /users/{user_gid}/user_task_list
- ❌ GET /user_task_lists/{user_task_list_gid}/tasks

### 27. Users ✅ (Partial)
Current: 2/5+ tools
- ❌ GET /users
- ✅ GET /users/me
- ❌ GET /users/{user_gid}
- ✅ GET /workspaces/{workspace_gid}/users
- ❌ GET /teams/{team_gid}/users

### 28. Project Templates ❌
Tools needed: 4
- ❌ GET /project_templates/{project_template_gid}
- ❌ GET /teams/{team_gid}/project_templates
- ❌ POST /project_templates/{project_template_gid}/instantiateProject
- ❌ GET /workspaces/{workspace_gid}/project_templates

### 29. Task Templates ❌
Tools needed: 4
- ❌ GET /task_templates/{task_template_gid}
- ❌ GET /projects/{project_gid}/task_templates
- ❌ POST /task_templates/{task_template_gid}/instantiateTask
- ❌ DELETE /task_templates/{task_template_gid}

### 30. Organization Exports ❌
Tools needed: 2
- ❌ GET /organization_exports/{organization_export_gid}
- ❌ POST /organization_exports

### 31. Jobs ❌
Tools needed: 1
- ❌ GET /jobs/{job_gid}

### 32. Typeahead ❌
Tools needed: 2
- ❌ GET /workspaces/{workspace_gid}/typeahead
- ❌ GET /workspaces/{workspace_gid}/typeahead/{type}

### 33. Audit Log API ❌
Tools needed: 1
- ❌ GET /workspaces/{workspace_gid}/audit_log_events

### 34. Allocations ❌
Tools needed: 5
- ❌ GET /allocations
- ❌ GET /allocations/{allocation_gid}
- ❌ POST /allocations
- ❌ PUT /allocations/{allocation_gid}
- ❌ DELETE /allocations/{allocation_gid}

### 35. Access Requests ❌
Tools needed: 2
- ❌ GET /access_requests
- ❌ POST /access_requests/{access_request_gid}/approve

### 36. Reactions ❌
Tools needed: 4
- ❌ GET /tasks/{task_gid}/reactions
- ❌ POST /tasks/{task_gid}/reactions
- ❌ DELETE /reactions/{reaction_gid}
- ❌ GET /reactions/{reaction_gid}

### 37. Rules ❌
Tools needed: 3
- ❌ GET /rules/{rule_gid}
- ❌ POST /rules/{rule_gid}/trigger
- ❌ GET /projects/{project_gid}/rules

### 38. Memberships (Generic) ❌
Tools needed: 4
- ❌ GET /memberships
- ❌ POST /memberships
- ❌ DELETE /memberships/{membership_gid}
- ❌ GET /memberships/{membership_gid}

## Summary

### Current State
- **Implemented Resources**: 8/38 (21%)
- **Implemented Tools**: 19/200+ (< 10%)

### Required Implementation
- **Missing Resources**: 30
- **Missing Tools**: ~180+
- **Total Tools Needed**: ~200

### Priority Groups

#### High Priority (Core Operations)
1. Complete CRUD for existing resources (Tasks, Projects, Goals, Portfolios)
2. Teams and Team Memberships
3. Tags
4. Stories/Comments
5. Attachments
6. Status Updates
7. Project/Portfolio Memberships

#### Medium Priority (Enhanced Features)
8. Webhooks
9. Task Dependencies
10. Subtasks
11. Custom Field Settings
12. Project/Task Templates
13. Time Tracking
14. Reactions

#### Lower Priority (Advanced/Admin)
15. Audit Log
16. Organization Exports
17. Batch API
18. Events
19. Allocations
20. Access Requests
21. Rules
22. Typeahead
