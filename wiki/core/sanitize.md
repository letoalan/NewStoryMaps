# Module Core : `sanitize.ts`

Source : [`src/core/sanitize.ts`](file:///src/core/sanitize.ts)

## Rôle
Module de sécurisation et d'assainissement du code HTML arbitraire saisi ou importé dans les descriptions de récits.

## Fonctionnalités
- Suppression ciblée des balises d'exécution (`<script>`, `<style>`, `<object>`, `<embed>`, `<template>`).
- Nettoyage automatique des gestionnaires d'événements (`onclick`, `onerror`, `onload`...).
- Filtrage strict des protocoles d'URL (`javascript:`, `vbscript:`, `data:text/html`).
- Autorisation sécurisée des images embarquées (`data:image/*`) et liens hypertextes réguliers.

