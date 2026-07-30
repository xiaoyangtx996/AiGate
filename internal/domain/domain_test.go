package domain

import "testing"

func TestProjectHasIndependentIdentity(t *testing.T) {
	project := Project{ID: "project-1", OrganizationID: "department-1"}
	if project.ID == project.OrganizationID {
		t.Fatal("project must be an independent asset container")
	}
}
