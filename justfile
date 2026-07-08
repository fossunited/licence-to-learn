# License to Learn - task runner.
# Every recipe is an off-the-shelf CLI; there is no hand-maintained logic here.

set shell := ["bash", "-uc"]

# List recipes
default:
    @just --list

# Serve with live reload
serve:
    zola serve

# Build the static site into ./public
build:
    zola build

# Convert a Google Doc (downloaded as .docx) to a clean case-study markdown
import-case file name:
    pandoc "{{ file }}" -t gfm --wrap=none -o "content/cases/{{ name }}.md"
    @echo "wrote content/cases/{{ name }}.md — add front matter (title/date/description)"

# Validate every CSV against its JSON Schema
check-data:
    for f in data/*.csv; do \
      s="${f%.csv}.schema.json"; \
      echo "validate $f"; \
      qsv validate "$f" "$s"; \
    done

# Lint code/content
lint:
    taplo lint config.toml
    stylelint "static/css/**/*.css"
    markdownlint "content/**/*.md" "*.md"
    typos

# Format everything
fmt:
    treefmt

# Build + link/alt/anchor check the output
check-html: build
    htmltest

# Full gate (what CI runs)
check: check-data lint
    zola check
    just check-html