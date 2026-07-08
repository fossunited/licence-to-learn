+++
title = "Data so far"
description = "Machine-readable data built from RTI responses. Software, the institutions that use it, and what it costs."
+++

These tables are built directly from our open spreadsheet and validated on every change. Sort, filter and search to explore.

## Total Amount being spent

{{ spend_counter(csv="data/costs.csv") }}

## Spend by institute

Yearly software expenditure reported by each responding institute. Hover or focus a point to see the amount.

{{ spend_cards(csv="data/costs.csv") }}

## All institutes together

{{ spend_lines(csv="data/costs.csv") }}

## Software & where it's used

{{ data_table(csv="data/software.csv", schema="data/software.schema.json", caption="Proprietary software documented across institutions, with category and example users.") }}

## Total costs

{{ data_table(csv="data/costs.csv", schema="data/costs.schema.json", caption="Reported annual software expenditure per institution.") }}

Source spreadsheet: [open data on Google Sheets](https://docs.google.com/spreadsheets/d/1mleblSlJoORwS5xbOM5awZ9LDCC8cvbYjJyuYtg5kl8/edit).
