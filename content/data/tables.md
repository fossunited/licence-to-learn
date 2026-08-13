+++
title = "Tables"
description = "The raw software and cost data behind the cards on /data/, as sortable, searchable tables."
template = "page.html"
+++

## Software dependencies mapped

{{ data_table(csv="data/software.csv", schema="data/software.schema.json", caption="Stack as reported by NITs, IIMs and IIITs. Coming up next: AIIMS.") }}

## Total costs

{{ data_table(csv="data/costs.csv", schema="data/costs.schema.json", caption="Reported annual software expenditure per institution.") }}
