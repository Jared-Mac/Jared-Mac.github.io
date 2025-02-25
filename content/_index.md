---
# Leave the homepage title empty to use the site title
title: ""
date: 2024-02-13
type: landing

design:
  # Default section spacing
  spacing: "6rem"

sections:
  - block: resume-biography-3
    content:
      # Choose a user profile to display (a folder name within `content/authors/`)
      username: admin
      text: ""
      # Show a call-to-action button under your biography? (optional)
      button:
        text: Download CV
        url: uploads/resume.pdf
    design:
      css_class: dark
      background:
        color: rgb(25, 25, 25)
        gradient:
          enable: true
          angle: 0
          start: rgb(25, 25, 25)
          end: rgb(40, 40, 40)
  - block: collection
    content:
      title: Featured Publications
      filters:
        folders:
          - publication
        featured_only: true
    design:
      view: citation
---
