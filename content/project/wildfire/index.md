---
title: Wildfire Intelligence
summary: "Two connected studies in wildfire intelligence: preserving the signal for detection and generating possible next fire states from fire and wind observations."
tags:
  - Machine Learning
  - Edge Computing
  - Computer Vision
date: "2023-01-01"

external_link: ""

image:
  caption: Wildfire Intelligence
  focal_point: Smart

links:
url_code: ""
url_pdf: ""
url_slides: ""
url_video: ""

components:
  - name: fire-compression
    focus: Detection & compression
    summary: Image-classification experiments supporting wildfire detection under computation and communication constraints.
    url: https://github.com/Jared-Mac/fire-compression
  - name: firegen
    focus: Conditional generation
    summary: A conditional variational autoencoder that uses the current fire state, wind speed, and wind direction to sample possible next states.
    url: https://github.com/Jared-Mac/firegen

slides: ""
---

Wildfire monitoring poses two connected questions: how much information does a detector need, and what could happen next? This project brings together detection, compression, and generative modeling for settings where compute, bandwidth, and response time matter.

## Preserve the signal

The detection strand explores how to preserve useful visual information under tight resource budgets. Supervised image-compression experiments reduced inputs to 4.8 KB while preserving 72.9% wildfire-detection accuracy. An edge-computing framework used early-exit neural networks to support distributed detection.

The [fire-compression repository](https://github.com/Jared-Mac/fire-compression) contains the image-classification training and evaluation code for this strand: a ResNet101 model with a binary wildfire classification head, trained on resized images from a wildfire dataset.

## Generate possible next states

[Firegen](https://github.com/Jared-Mac/firegen) explores wildfire spread with a conditional variational autoencoder. Its data pipeline pairs the current fire frame with wind-speed and wind-direction maps, using the following fire frame as the training target.

At inference, the model samples a conditional latent distribution to generate possible next fire states. The repository includes a neural-network baseline, CVAE training and comparison code, and exploratory conditional-diffusion work. The CVAE’s sampled outputs let the study explore variation beyond a single deterministic prediction.

Together, these studies connect resource-aware perception with environmental modeling and the broader digital-twin work on disaster resilience.
