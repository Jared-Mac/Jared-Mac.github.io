---
# Leave the homepage title empty to use the site title
title: ""
date: 2024-02-13
type: landing

design:
  # Default section spacing
  spacing: "5.5rem"

sections:
  - block: resume-biography-3
    content:
      # Choose a user profile to display (a folder name within `content/authors/`)
      username: admin
      text: |-
        <span class="hero-kicker">Systems × machine learning</span>
        <p class="hero-lead">I design distributed intelligence for places where bandwidth, compute, and response time are limited.</p>
        <p class="hero-summary">My research spans task-informed neural compression, progressive inference, and community-scale digital twins for environmental monitoring and disaster resilience.</p>
        <div class="hero-proof" aria-label="Research profile highlights">
          <span><strong>5</strong> published papers</span>
          <span><strong>1</strong> manuscript under review</span>
          <span><strong>3</strong> applied research domains</span>
        </div>
      # Show a call-to-action button under your biography? (optional)
      button:
        text: Download CV
        url: uploads/resume.pdf
    design:
      css_class: dark
      background:
        color: rgb(8, 21, 24)
        gradient:
          enable: true
          angle: 135
          start: rgb(8, 21, 24)
          end: rgb(17, 55, 57)
  - block: markdown
    content:
      title: Research agenda
      text: |-
        <div class="focus-grid">
          <section class="focus-card">
            <span class="focus-number">01</span>
            <span class="focus-kicker">Edge intelligence</span>
            <h3>Make split inference practical when bandwidth is the bottleneck.</h3>
            <p>I build adaptive neural compression and progressive inference systems that preserve task utility while reducing what mobile sensors need to transmit.</p>
          </section>
          <section class="focus-card">
            <span class="focus-number">02</span>
            <span class="focus-kicker">Disaster resilience</span>
            <h3>Connect perception models to operational digital twins.</h3>
            <p>My SHIELD work links edge sensing, simulation, and visualization for wildfire intelligence and community-scale decision support.</p>
          </section>
          <section class="focus-card">
            <span class="focus-number">03</span>
            <span class="focus-kicker">Applied vision</span>
            <h3>Deploy computer vision in constrained field settings.</h3>
            <p>Recent projects span UAV wildfire monitoring, wildlife detection, smart waste systems, VR lab tracking, and geospatial trail mapping.</p>
          </section>
        </div>
    design:
      css_class: section-readable
  - block: markdown
    content:
      title: Current research
      text: |-
        <div class="showcase">
          <div class="showcase-copy">
            <p class="eyebrow"><span class="status-dot"></span> Under review</p>
            <h3>Modulated Adaptive Neural Compression for task-informed split computing</h3>
            <p>MANTIS moves task awareness to the client side of a UAV split-computing pipeline. A lightweight task detector estimates the current mission objective, conditional GDN reshapes the compressed latent before entropy coding, and the edge server routes compact task-shaped features to task-specific heads.</p>
            <div class="metric-strip">
              <div><strong>62.2%</strong><span>bitrate reduction at matched downstream accuracy</span></div>
              <div><strong>9.3%</strong><span>average normalized task-accuracy gain at matched bitrate</span></div>
              <div><strong>7-17k</strong><span>bit payloads at the beta-3 operating point</span></div>
            </div>
            <div class="showcase-actions">
              <a href="/project/mantis/">Explore the project <span aria-hidden="true">→</span></a>
              <a href="/publication/preprint/mantis/">Publication details</a>
            </div>
          </div>
          <figure class="showcase-figure">
            <img src="/uploads/mantis/architecture.png" alt="MANTIS paper architecture figure showing task specification, training, and split deployment">
            <figcaption>The paper architecture ties task specification and training to the client/server split-deploy path.</figcaption>
          </figure>
        </div>
        <div class="figure-grid">
          <figure>
            <img src="/uploads/mantis/e2e-latency.png" alt="MANTIS end-to-end latency across UAVid, WAID, and Boreal Fire workloads">
            <figcaption>Latency curves show where kilobit-scale task-conditioned payloads matter most.</figcaption>
          </figure>
          <figure>
            <img src="/uploads/mantis/channel-usage-bpp.png" alt="MANTIS latent channel usage heatmap">
            <figcaption>Channel usage visualizes how task conditioning reallocates latent bitrate.</figcaption>
          </figure>
        </div>
    design:
      css_class: section-readable section-showcase
  - block: collection
    content:
      title: Selected projects
      filters:
        folders:
          - project
    design:
      view: article-grid
      fill_image: false
      columns: 3
  - block: collection
    content:
      title: Selected publications
      filters:
        folders:
          - publication
        featured_only: true
    design:
      view: citation
---
