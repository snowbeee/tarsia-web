# Getting the app found, and used

The goal is teachers using this. Search is the cheapest way to reach them,
because the people who would want it are already looking for something — just
not for us, since they have never heard of us. They are looking for
Formulator Tarsia.

This document is the plan: what the site now does, why those pages and not
others, and the part that cannot be done in code.

## The position we are in

The head term — *tarsia puzzle maker* — is contested, and we would be the
newest and weakest site in it. The ones already there:

| Site | What it is |
|---|---|
| tarsiamaker.co.uk | A simple online editor, linked from Mr Barton Maths |
| sageteachers.com/tarsia-maker | Browser maker, free to try |
| tarsia.ai | An exact-match domain, well optimised |
| planitteachers.ai | Free to use, account required to print |
| changing-phase.blogspot.com | Four shapes, PDF export |
| biologybybradford.com/tools/tarsia | Browser builder with an answer key |
| ironstamp/tarsia-generator | Open source, MathJax, hexagon and triangle |

Going at that term head-on means competing on domain authority we do not have,
and it would take years. There is a better way in.

## The way in: the things only this app does

Nobody in that table opens `.fjsw` files. Searches about them land on
file-extension content farms that say the format cannot be converted and that
you must install the Windows app, or on a converter that wants your file
uploaded to its server first. Both answers are wrong, and this app is the
counter-example.

That is the whole opportunity, and it has the shape you want:

- **High intent.** Somebody searching *how to open an fjsw file* has the file
  in front of them and a lesson to teach. They are not browsing.
- **Weak competition.** The pages ranking now are automated extension-database
  pages that answer nothing. They are not hard to beat with a page that
  actually solves the problem.
- **Uniquely ours.** We cannot be copied quickly, because the parser is the
  hard part and it already exists.
- **It leads where we want.** Somebody who opens an old file here is one
  click from making a new one.

The same holds for the second cluster — *Tarsia on a Mac / Chromebook /
without Windows*. Real, repeated, unsolved by the desktop app by definition,
and answered here simply by the app being a web page.

So: win the long tail first, be the answer teachers link to, and come at the
head term later from a site that has earned some standing.

## The pages, and what each is for

| Page | Target | Job |
|---|---|---|
| `/` | *tarsia puzzle maker*, *tarsia maker free* | The app, plus text explaining what it is. Converts; ranks eventually. |
| `/open-fjsw-file/` | *how to open an fjsw file*, *fjsw viewer*, *fjsw to pdf* | The wedge. Beat the extension farms. |
| `/tarsia-for-mac/` | *tarsia for mac*, *formulator tarsia chromebook* | The second cluster. |
| `/what-is-a-tarsia-puzzle/` | *what is a tarsia puzzle* | Top of funnel. The page other teachers link to when explaining the idea. |

They cross-link, so a visitor who arrives at any one of them finds the app.

### Why they are separate HTML files

The app is a React root. Before its JavaScript runs, `index.html` is an empty
`<div>` — there is nothing on the page to index, and search engines render
JavaScript late, inconsistently, and with less weight than HTML they can read
immediately. Every word that matters is therefore in files that need no
script at all, and the homepage carries its explanation below the app in the
same way.

This is also why these pages are fast: they are a few kilobytes of HTML and
one small stylesheet, with no framework behind them.

## What has to happen outside the code

The site is now a good answer. That is necessary and not sufficient — search
engines need to find it, and the first links have to come from somewhere.

### Do these first

1. **Deploy it.** The public site is `https://tarsia.syrovy.tech` on
   Cloudflare Pages, and that address is already baked into the build — see
   `DEPLOY.md`. There is no `www` variant, so there is nothing to redirect,
   and it is now the only copy: the school's internal install was retired
   rather than left to compete with it for the same searches.
2. **Google Search Console and Bing Webmaster Tools.** Verify the domain,
   submit `sitemap.xml`, and use "Request indexing" on all four pages. This is
   the difference between being found in days and being found in months. Both
   are free, and Search Console is also where you will see which queries you
   actually turn up for — which is worth more than any guess in this document.
3. **Check the structured data.** Paste each URL into Google's Rich Results
   Test. The FAQ markup can put your questions directly into the results page,
   which raises the click-through rate on a result that is not first.
4. **Check what Cloudflare's `robots.txt` says.** Cloudflare serves its own
   managed one, so the `Sitemap:` line from the build may not reach it:

   ```bash
   curl -s https://tarsia.syrovy.tech/robots.txt | grep -i sitemap
   ```

   The same file currently blocks the AI training crawlers — GPTBot,
   ClaudeBot, Google-Extended and the rest. That is a reasonable default and
   it does not stop Google or Bing. It is worth knowing, though, that a
   growing share of "how do I open an .fjsw file" questions are now asked of
   an assistant rather than a search box, and an assistant can only recommend
   what it is allowed to read. The search-oriented crawlers are not on that
   block list, so this is a question of degree, not an on/off switch — but it
   is your call, and it is made in the Cloudflare dashboard, not here.

### Then get the first links

Search engines rank pages partly on who links to them, and a brand-new domain
has nobody. These are the places that actually matter for this audience, in
rough order of value:

- **Mr Barton Maths.** The centre of gravity for UK maths teaching resources,
  and already the referrer for tarsiamaker.co.uk. One mention there is worth
  more than everything else on this list together.
- **TES.** Publish a few finished puzzles as free resources, with the app
  credited in the description. The resource is the thing people want; the link
  comes with it.
- **r/matheducation and r/Teachers.** Not an advert — an answer. Both get
  recurring "how do I open these old Tarsia files" and "is there a Mac
  version" questions, and a direct answer to one of those is welcome.
- **The file-extension sites themselves.** Several accept corrections. Telling
  file.org and file-extensions.org that `.fjsw` can be opened in a browser
  updates pages that currently rank for exactly our term.
- **Wikipedia's list of file formats**, if `.fjsw` is listed and the entry is
  wrong or incomplete.
- **Teacher Facebook groups and Bluesky.** Where UK maths and MFL teachers
  share resources. The social card exists for this.
- **The school.** A link from the Park Lane site is one line of HTML and a
  genuine, relevant link from an established education domain.
- **GitHub.** Set the repository description and topics, and add the live URL
  to the About box. Costs nothing.

### Watch out for

- **Soft 404s.** Before `404.html` existed, every wrong URL on Cloudflare
  Pages returned the app with a **200**, which a crawler reads as an endless
  supply of duplicate homepages. It is fixed; it is also the kind of thing
  that comes back quietly if the deployment setup changes, and Search Console
  will tell you under Pages → "Soft 404".

### Measure the right thing

Page views are not the goal; puzzles printed is. If you want to know whether
any of this is working, count PDF exports — privately, in a way that does not
undermine the claim on every page that nothing leaves the user's computer.
A self-hosted counter on the export button, with no identifiers attached, is
enough to answer "is anybody using this", which is the only question worth
asking for the first year.

## What would be worth building next

In rough order of what it would do for adoption:

- **Fix the dark colour scheme in the app.** `index.css` defines a dark
  palette and `App.css` hardcodes light colours over it, so a visitor whose
  system is set to dark gets white-on-white toolbar buttons. Perhaps a third
  of first-time visitors see that, and some of them will leave. This is the
  highest-value fix on the list and it is not an SEO one.
- **A gallery of finished puzzles**, each on its own page, each printable
  without typing anything. It is what teachers actually search for
  (*quadratic equations tarsia*), it is a page per topic, and every one is a
  reason to link to the site.
- **Typeset maths**, so imported equations survive instead of flattening to
  text. It is the one real gap against the desktop app.
