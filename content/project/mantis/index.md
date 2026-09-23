---
title: MANTIS Neural Compression
summary: Task-informed neural compression for UAV split inference, in which estimated task relevance conditions the encoder before the wireless bottleneck.
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

Mobile sensing platforms such as UAVs increasingly rely on edge servers to run perception models that exceed onboard compute and energy budgets. Split computing makes this offload possible, but over constrained wireless links the transmitted representation becomes the bottleneck. The problem is sharper in multi-mission deployments. Over the wildland–urban interface, a single sortie may require urban scene parsing, wildlife detection, and smoke detection from the same visual stream, and each task depends on different visual evidence. Existing neural feature compression methods are static: they produce the same latent regardless of which task is currently relevant.

MANTIS (Modulated Adaptive Neural compression for Task-Informed Split computing) makes task relevance a first-class compression variable. Relevance is decided on the client, before entropy coding, so that limited uplink capacity is allocated to the evidence the active task requires.

## Architecture

Figure 1 traces the runtime data path.

- **Shared stem.** Three 3 × 3 convolutional blocks map the input frame to early features while preserving spatial resolution. The stem is intentionally shallow, which limits client latency and memory while retaining edges, contours, small objects, and diffuse structures.
- **Task detector.** A lightweight classifier over the stem features estimates a task-relevance vector, P(task), and a conditioning embedding.
- **Conditional analysis transform.** The embedding modulates ten Conditional Generalized Divisive Normalization (cGDN) sites within the encoder. Because cGDN alters cross-channel normalization, task relevance changes which channels inhibit, preserve, or amplify visual evidence before quantization, rather than gating an already formed latent.
- **Entropy-coded latent.** The resulting latent, ẑ, is entropy-coded under a task-specific entropy bottleneck and transmitted over the uplink.
- **Edge inference.** On the server, ẑ is routed to the corresponding task decoder and head.

The system is trained in two stages. Stage 1 pretrains the shared stem and task detector so that the conditioning signal is calibrated. Stage 2 attaches the conditional encoder, entropy bottlenecks, decoders, and heads, and jointly optimizes downstream task loss and entropy-coded rate.

## Results

MANTIS-TC, the task-conditioned system, is evaluated on UAVid semantic segmentation, WAID wildlife detection, and Boreal Fire smoke detection. It is compared against JPEG, WebP, LADON, five learned image codecs, and MANTIS-TA, a non-conditioned task-aware ablation.

- **Rate–utility.** MANTIS-TC improves the low- and mid-rate task-utility frontier. It reduces bitrate by up to 62.2% at matched downstream accuracy and improves average normalized task accuracy by up to 9.3% at matched bitrate, relative to the best non-conditioned or static baseline at the matched comparison point.
- **Latent allocation.** Channel-usage and cross-task modulation analyses show that conditioning changes which channels and spatial structures carry bitrate, rather than simply scaling code length.
- **Payload.** At β = 3, mean transmitted payloads are 7.02 kbit (UAVid), 16.80 kbit (WAID), and 8.39 kbit (Boreal Fire). These are 16–38× smaller than LADON and 60–243× smaller than JPEG or WebP full-image offload.
- **Latency.** With client execution measured on a Jetson AGX Xavier, MANTIS is most effective in communication-bound regimes, particularly constrained IP-radio and low-end cellular links of roughly 1–10 Mbps. There, full-quality image transmission dominates latency, while task-conditioned latents approach the measured compute floor.

## Limitations and future work

The evaluation uses single-task batches and task-specific entropy bottlenecks, not a shared multi-task packet format. Open problems include transmitting latents conditioned on several active tasks and modular task management: adding or removing tasks without retraining the shared client. A further step is integration with a real UAV datalink, evaluated under changing bandwidth with a policy that selects task priorities, rate points, and deadlines online.
