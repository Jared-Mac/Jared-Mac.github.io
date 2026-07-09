---
title: MANTIS Neural Compression
summary: Task-informed split-computing system that compresses UAV visual streams into compact latents for edge perception.
tags:
  - Edge Computing
  - Split Computing
  - Neural Compression
  - Computer Vision
date: "2025-01-01"

external_link: ""

image:
  caption: MANTIS paper architecture
  focal_point: Smart

links:
url_code: ""
url_pdf: ""
url_slides: ""
url_video: ""

slides: ""
---

MANTIS is a task-informed split-computing system for UAV perception. It compresses visual evidence before transmission by estimating task relevance on the client, modulating the neural analysis transform, entropy-coding the resulting latent, and routing the compact representation to task-specific edge heads.

The system is evaluated across UAV-relevant workloads:

- UAVid semantic segmentation for urban scene parsing
- WAID wildlife detection for aerial environmental monitoring
- Boreal Fire smoke detection for wildfire intelligence

Compared with JPEG, WebP, LADON, learned image codecs, and non-conditioned ablations, MANTIS improves the low- and mid-rate task-utility frontier. The paper reports up to 62.2% bitrate reduction at matched downstream accuracy and up to 9.3% average normalized task-accuracy improvement at matched bitrate.

![MANTIS architecture](/uploads/mantis/architecture.png)

![End-to-end latency across task workloads](/uploads/mantis/e2e-latency.png)
