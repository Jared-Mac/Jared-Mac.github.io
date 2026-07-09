---
title: 'Projects'
date: 2024-05-19
type: landing

design:
  # Section spacing
  spacing: '5rem'

# Page sections
sections:
  - block: markdown
    content:
      title: Projects
      text: |-
        Selected systems research across edge intelligence, environmental monitoring, disaster-resilience digital twins, and human-centered computing.
    design:
      css_class: page-intro section-readable
  - block: collection
    content:
      title: Selected work
      text: Research projects spanning task-informed split computing, disaster-resilience digital twins, wildfire intelligence, geospatial machine learning, and virtual-reality labs.
      filters:
        folders:
          - project
    design:
      view: article-grid
      fill_image: false
      columns: 3
      css_class: project-list
---
