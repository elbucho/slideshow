# ------------------------------------------------------------------------------
# Slideshow Makefile
# ------------------------------------------------------------------------------

# ------------------------------------------------------------------------------
# Global variables
# ------------------------------------------------------------------------------
export OCI_VERSION  := $(shell git describe --tags --always --dirty 2>/dev/null || echo dev)
export OCI_REVISION := $(shell git rev-parse HEAD 2>/dev/null || echo unknown)
export OCI_CREATED  := $(shell date -u +%Y-%m-%dT%H:%M:%SZ)

# Which Docker Compose profiles should be active?
#
# Examples:
#   make dev PROFILES=nest
#   make dev PROFILES=vue
#   make dev PROFILES="nest react"
#
PROFILES ?=

# ------------------------------------------------------------------------------
# Compose files
# ------------------------------------------------------------------------------

COMPOSE := docker compose \
	-f docker/compose/compose.yml

LOCAL_COMPOSE := $(COMPOSE) \
	-f docker/compose/compose.local.yml

TEST_E2E_COMPOSE := $(COMPOSE) \
	-f docker/compose/compose.test-e2e.yml

TEST_COV_COMPOSE := $(COMPOSE) \
	-f docker/compose/compose.test-cov.yml

TEST_COV_COMPOSE := $(COMPOSE) \
	-f docker/compose/compose.test.yml

PROFILE_FLAGS := $(foreach p,$(PROFILES),--profile $(p))

# ------------------------------------------------------------------------------
# Utility macros
# ------------------------------------------------------------------------------

define require_profiles
	$(if $(strip $(PROFILES)),,$(error Please specify PROFILES=<profile>))
endef

define require_single_profile
	$(call require_profiles)
	$(if $(filter 1,$(words $(PROFILES))),,\
		$(error This target requires exactly one profile))
endef

SERVICE := $(word 1,$(PROFILES))

# ------------------------------------------------------------------------------
# Stack management
# ------------------------------------------------------------------------------

.PHONY: dev
dev:
	$(call require_profiles)
	$(LOCAL_COMPOSE) $(PROFILE_FLAGS) up --build

.PHONY: devd
devd:
	$(call require_profiles)
	$(LOCAL_COMPOSE) $(PROFILE_FLAGS) up -d --build

.PHONY: stop
stop:
	$(call require_profiles)
	$(LOCAL_COMPOSE) $(PROFILE_FLAGS) down

.PHONY: clean
clean:
	$(call require_profiles)
	$(LOCAL_COMPOSE) $(PROFILE_FLAGS) down -v --remove-orphans

.PHONY: logs
logs:
	$(call require_profiles)
	$(LOCAL_COMPOSE) $(PROFILE_FLAGS) logs -f

.PHONY: rebuild
rebuild:
	$(call require_profiles)
	$(LOCAL_COMPOSE) $(PROFILE_FLAGS) build --no-cache

# ------------------------------------------------------------------------------
# Development utilities
# ------------------------------------------------------------------------------

.PHONY: shell
shell:
	$(call require_single_profile)
	$(LOCAL_COMPOSE) exec $(SERVICE) sh

.PHONY: test
test:
	$(call require_single_profile)
	$(TEST_COMPOSE) $(PROFILE_FLAGS) \
		up \
		--build \
		--abort-on-container-exit \
		--exit-code-from $(SERVICE) && \
	$(LOCAL_COMPOSE) $(PROFILE_FLAGS) logs $(SERVICE)

.PHONY: test-e2e
test-e2e:
	$(call require_single_profile)
	$(TEST_E2E_COMPOSE) $(PROFILE_FLAGS) \
		up \
		--build \
		--abort-on-container-exit \
		--exit-code-from $(SERVICE) && \
	$(LOCAL_COMPOSE) $(PROFILE_FLAGS) logs $(SERVICE)

.PHONY: test-cov
test-cov:
	$(call require_single_profile)
	$(TEST_COV_COMPOSE) $(PROFILE_FLAGS) \
		up \
		--build \
		--abort-on-container-exit \
		--exit-code-from $(SERVICE) && \
	$(LOCAL_COMPOSE) $(PROFILE_FLAGS) logs $(SERVICE)

.PHONY: db-postgres
db-postgres:
	$(LOCAL_COMPOSE) exec postgres psql \
		-U slideshow \
		-d slideshow-dev

# ------------------------------------------------------------------------------
# Help
# ------------------------------------------------------------------------------

.PHONY: help
help:
	@echo ""
	@echo "Slideshow"
	@echo ""
	@echo "Stack commands:"
	@echo "  make dev PROFILES=nest"
	@echo "  make dev PROFILES=\"nest react\""
	@echo "  make stop"
	@echo "  make logs PROFILES=nest"
	@echo ""
	@echo "Application commands:"
	@echo "  make shell PROFILES=nest"
	@echo "  make test PROFILES=nest"
	@echo ""