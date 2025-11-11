describe("Campus Map Navigation", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  describe("Application Loading", () => {
    it("should load the application successfully", () => {
      cy.get('[data-testid="app-header"]').should("be.visible");
      cy.contains("MavPath").should("be.visible");
    });

    it("should display the map canvas", () => {
      // Wait for Google Maps to load
      cy.get('[role="region"]', { timeout: 10000 }).should("exist");
    });
  });

  describe("Desktop View - Tab Navigation", () => {
    it("should have directions and events tabs visible", () => {
      cy.get('[data-testid="directions-tab"]').should("be.visible");
      cy.get('[data-testid="events-tab"]').should("be.visible");
    });

    it("should have sidebar open by default on desktop", () => {
      // Sidebar should be visible on desktop (width >= 1024px)
      cy.get('[data-testid="directions-tab"]').should("be.visible");
      cy.get('[data-testid="events-tab"]').should("be.visible");
    });

    it("should not show mobile menu button on desktop", () => {
      // Mobile menu button should be hidden on desktop (lg:hidden)
      cy.get('[data-testid="mobile-menu-button"]').should("not.be.visible");
    });

    it("should switch from directions to events tab", () => {
      // Verify Directions tab is active by default
      cy.get('[data-testid="directions-tab"]').first().should(
        "have.attr",
        "aria-pressed",
        "true"
      );

      // Click Events tab (use .first() since tabs exist in both desktop and mobile sidebar)
      cy.get('[data-testid="events-tab"]').first().click();

      // Verify Events tab is now active
      cy.get('[data-testid="events-tab"]').first().should(
        "have.attr",
        "aria-pressed",
        "true"
      );
      cy.get('[data-testid="directions-tab"]').first().should(
        "have.attr",
        "aria-pressed",
        "false"
      );
    });

    it("should switch back to directions tab from events", () => {
      // Go to Events tab first
      cy.get('[data-testid="events-tab"]').first().click();

      // Switch back to Directions
      cy.get('[data-testid="directions-tab"]').first().click();

      // Verify Directions tab is active
      cy.get('[data-testid="directions-tab"]').first().should(
        "have.attr",
        "aria-pressed",
        "true"
      );
      cy.get('[data-testid="events-tab"]').first().should(
        "have.attr",
        "aria-pressed",
        "false"
      );
    });
  });

  describe("Directions Panel", () => {
    it("should display origin input by default", () => {
      cy.get('[data-testid="origin-input"]').should("be.visible");
    });

    it("should not display destination input initially", () => {
      cy.get('[data-testid="destination-input"]').should("not.exist");
    });

    it("should have travel mode selector visible", () => {
      cy.contains("Travel Mode").should("be.visible");
      cy.get('button[id="mode"]').should("be.visible");
    });

    it("should have get directions button", () => {
      cy.contains("Choose Destination").should("be.visible");
    });

    it("should display quick start tips", () => {
      cy.contains("Quick Start").should("be.visible");
      cy.contains("Select a starting point").should("be.visible");
    });
  });

  describe("Events Panel", () => {
    beforeEach(() => {
      // Switch to Events tab (use .first() to avoid duplicate element error)
      cy.get('[data-testid="events-tab"]').first().click();
    });

    it("should display events search input", () => {
      cy.get('[data-testid="events-search-input"]').should("be.visible");
    });

    it("should have date filter input", () => {
      cy.get('input[id="events-date"]').should("be.visible");
    });

    it("should have location filter dropdown", () => {
      cy.get('button[id="events-location"]').should("be.visible");
      cy.contains("All locations").should("be.visible");
    });

    it("should have tag filter dropdown", () => {
      cy.get('button[id="events-tag"]').should("be.visible");
    });

    it("should have reset filters button", () => {
      cy.contains("Reset filters").should("be.visible");
    });

    it("should allow typing in search input", () => {
      cy.get('[data-testid="events-search-input"]')
        .first()
        .type("engineering")
        .should("have.value", "engineering");
    });
  });

  describe("Map Controls", () => {
    it("should have events toggle switch visible", () => {
      cy.get('[data-testid="events-toggle"]').should("be.visible");
    });

    it("should have shuttles toggle button visible", () => {
      cy.get('[data-testid="shuttles-toggle-button"]').should("be.visible");
    });

    it("should be able to toggle events switch", () => {
      // Click events toggle
      cy.get('[data-testid="events-toggle"]').click();
      // Should still be visible after click
      cy.get('[data-testid="events-toggle"]').should("be.visible");
    });

    it("should be able to click shuttles toggle button", () => {
      // Click shuttles button to open popover
      cy.get('[data-testid="shuttles-toggle-button"]').click();
      // Popover should appear with shuttle routes
      cy.contains("Shuttle routes").should("be.visible");
    });
  });

  describe("Event Assistant Bubble", () => {
    it("should display the AI assistant bubble", () => {
      // Look for the AI bubble button
      cy.contains("AI").should("be.visible");
    });

    it("should have bot icon in the bubble", () => {
      // The bubble should be visible in the bottom-right area
      cy.get('button[aria-label="Open UTA Event Assistant chat"]').should(
        "exist"
      );
    });
  });

  describe("Mobile View - Sidebar Toggle", () => {
    beforeEach(() => {
      // Set mobile viewport BEFORE visiting page
      // This ensures isSidebarOpen initializes to false
      cy.viewport(375, 667);
      cy.visit("/");
    });

    it("should show mobile menu button in header on mobile", () => {
      cy.get('[data-testid="mobile-menu-button"]').should("be.visible");
    });

    it("should have sidebar closed by default on mobile", () => {
      // The sidebar should not be open initially on mobile
      // Check aria-expanded attribute on mobile menu button
      cy.get('[data-testid="mobile-menu-button"]').should(
        "have.attr",
        "aria-expanded",
        "false"
      );
    });

    it("should open sidebar when clicking mobile menu button", () => {
      // Click the hamburger menu button (use force: true to click through SVG icon)
      cy.get('[data-testid="mobile-menu-button"]').click({ force: true });

      // Wait for sidebar animation
      cy.wait(350);

      // Check that button shows sidebar is expanded
      cy.get('[data-testid="mobile-menu-button"]').should(
        "have.attr",
        "aria-expanded",
        "true"
      );

      // Sidebar tabs should now be visible
      cy.get('[data-testid="directions-tab"]').should("be.visible");
      cy.get('[data-testid="events-tab"]').should("be.visible");
      cy.get('[data-testid="mobile-menu-close"]').should("be.visible");
    });

    it("should close sidebar when clicking close button", () => {
      // Open sidebar first
      cy.get('[data-testid="mobile-menu-button"]').click({ force: true });
      cy.wait(350);

      // Click close button (use force to click through SVG icon, and .first() for duplicate elements)
      cy.get('[data-testid="mobile-menu-close"]').first().click({ force: true });
      cy.wait(350);

      // Check that sidebar is closed via aria-expanded
      cy.get('[data-testid="mobile-menu-button"]').should(
        "have.attr",
        "aria-expanded",
        "false"
      );
    });

    it("should be able to switch tabs on mobile", () => {
      // Open sidebar
      cy.get('[data-testid="mobile-menu-button"]').click({ force: true });
      cy.wait(350);

      // Switch to Events tab (the mobile sidebar tabs are the last matching elements)
      cy.get('[data-testid="events-tab"]').last().click();

      // Events panel should be visible
      cy.get('[data-testid="events-search-input"]').should("be.visible");

      // Switch back to Directions
      cy.get('[data-testid="directions-tab"]').last().click();

      // Directions panel should be visible
      cy.get('[data-testid="origin-input"]').should("be.visible");
    });
  });

  describe("Responsive Behavior", () => {
    it("should adapt to tablet viewport (768px)", () => {
      // Set viewport before visiting
      cy.viewport(768, 1024);
      cy.visit("/");

      // Mobile menu should still be visible on tablet
      cy.get('[data-testid="mobile-menu-button"]').should("be.visible");

      // Should be able to open sidebar
      cy.get('[data-testid="mobile-menu-button"]').click({ force: true });
      cy.wait(350);

      cy.get('[data-testid="directions-tab"]').should("be.visible");
    });

    it("should show full layout on desktop viewport (1280px)", () => {
      // This is the default viewport, so can use normal beforeEach
      cy.get('[data-testid="mobile-menu-button"]').should("not.be.visible");

      // Sidebar should be visible by default
      cy.get('[data-testid="directions-tab"]').should("be.visible");
      cy.get('[data-testid="events-tab"]').should("be.visible");
    });

    it("should show full layout on large desktop (1920px)", () => {
      // Set viewport before visiting
      cy.viewport(1920, 1080);
      cy.visit("/");

      // Sidebar should be fully visible
      cy.get('[data-testid="directions-tab"]').should("be.visible");
      cy.get('[data-testid="events-tab"]').should("be.visible");
      cy.get('[data-testid="origin-input"]').should("be.visible");

      // Map should be visible
      cy.get('[role="region"]', { timeout: 10000 }).should("exist");
    });
  });
});
