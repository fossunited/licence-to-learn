+++
title = "Data so far"
description = "Machine-readable data built from RTI responses. Software, the institutions that use it, and what it costs."
+++

## Total Amount spent so far {{ info_tip(text="This is the total reported spend collected from FY2020-21 to FY2024-25.") }}

{{ spend_counter(csv="data/costs.csv") }}

## Spend by institute

Yearly software expenditure reported by each responding institute. Hover or focus a point to see the amount.

{{ spend_cards(csv="data/costs.csv") }}

## Software & where it's used

{{ data_table(csv="data/software.csv", schema="data/software.schema.json", caption="Proprietary software documented across institutions, with category and example users.") }}

## Total costs

{{ data_table(csv="data/costs.csv", schema="data/costs.schema.json", caption="Reported annual software expenditure per institution.") }}
