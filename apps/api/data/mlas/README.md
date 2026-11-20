# MLA data (curated, source-cited)

There is no single open, machine-readable list of India's ~4,000 MLAs, so MLAs are added **one state at a time**
by a person, from an **official** source (the state legislature's website, the Election Commission's results, or the
state gazette). `pnpm db:import mlas` loads every `*.csv` file in this folder.

## Rules
1. **Every row needs an `https://` source** that shows that MLA won that seat. The import rejects rows without one.
2. Use the **official** seat number (`ac_number`) for the state; seat names are only a cross-check.
3. One file per state and election, e.g. `karnataka-2023.csv`.
4. When an MLA changes (by-election, death, disqualification), edit the file and re-run the import.

## Format

```csv
state,ac_number,ac_name,mla_name,party,election_year,source_url,source_title,source_publisher
Karnataka,174,Example Seat,Full Name As Published,Party Name As Published,2023,https://…,Results of the 2023 Karnataka Legislative Assembly election,Election Commission of India
```

- `state` must match our state names exactly (e.g. `NCT of Delhi`, `Odisha`, `Telangana`).
- `election_year` is stored as the term's legislature, e.g. `2023` for the assembly elected in 2023.

See `template.csv.example` for an empty file to copy.

## Generating a starting file from Wikipedia

ECI takes old results pages down, so for many states the easiest checkable source is the Wikipedia election article,
whose results table cites ECI row by row:

```bash
pnpm --filter @trackbharat/api mla:wikipedia "2023_Karnataka_Legislative_Assembly_election" Karnataka 2023
```

The script writes `karnataka-2023.csv` with the article URL as the source on every row (publisher "Wikipedia (citing ECI
results)", stored as a secondary source, never "official"). **Review the file before committing.** These are members *as
elected*: fix by-elections and defections by hand.

The import cross-checks every row: the seat **number and name** must match our map. Rows that don't match are skipped
with a warning, and a file where fewer than 80% of rows match is skipped entirely (the numbering is probably off).

## Spelling variants (`seat-aliases.csv`)

Some sources spell the same numbered seat differently (Odisha: "Cuttack Sadar" / "Kataka Sadar", "Balasore" / "Baleshwar").
`seat-aliases.csv` lists reviewed pairs: state, seat number, our spelling, the other spelling. The import accepts a row
only when the number matches **and** the pair is listed exactly; nothing fuzzy. Add a pair only after checking the number.
