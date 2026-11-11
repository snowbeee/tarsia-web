// The questions each page answers, in one place.
//
// Google will only treat an FAQ as structured data if the same text is
// visible on the page, so the build renders both from this: seo/plugin.js
// writes the <dl> into the page's <!--faq--> marker and the matching
// FAQPage JSON-LD into its head. Edit an answer here and both change.
//
// Every answer below is a claim about what this app actually does. If the
// app changes, these are part of what changed.

export const FAQ = {
  'index.html': [
    [
      'Is it free?',
      'Yes. There is no account to make, no sign-in, no trial and no limit on how many puzzles you make or print.',
    ],
    [
      'Does my file get uploaded anywhere?',
      'No. The puzzle is read, drawn and turned into a PDF by your own browser, on your own machine. Nothing is sent to a server — there is no server to send it to, only a page of files. You can watch this yourself in your browser’s network tab, or load the page once and then work offline.',
    ],
    [
      'Can it open the files I made in Formulator Tarsia?',
      'Yes, that is what Open… is for. It reads the .fjsw files the Windows desktop app writes, and draws the hexagon, triangle, square, domino and matching-card templates. A file whose template it cannot draw still opens — you get the questions and answers out of it and a clear message about the shape, rather than an error.',
    ],
    [
      'Can I save back to .fjsw so the desktop app can read it?',
      'No. Save writes a .tarsia.json file, which this app reads back. Writing .fjsw would mean re-encoding the equations as MathML, and the import deliberately flattens them to plain text, so a round trip would quietly degrade the file rather than preserve it.',
    ],
    [
      'What do I need to install?',
      'Nothing. It is a web page. It works in Chrome, Safari, Firefox and Edge, on Windows, macOS, Linux, Chromebooks, iPads and Android tablets.',
    ],
    [
      'How do students actually use the printout?',
      'Print it, hand it out, and have students cut the pieces apart. They reassemble the shape by laying each question against its answer, so the finished shape itself tells them whether they got it right.',
    ],
  ],

  'open-fjsw-file/index.html': [
    [
      'What is an .fjsw file?',
      'It is the file the Formulator Tarsia desktop app saves — one cut-out puzzle, with its template, its question and answer pairs, and any equations in them. The format is XML inside, which is why it can be read here.',
    ],
    [
      'Do I need Formulator Tarsia installed to open one?',
      'No. Open the page, press Open…, pick the file. This works on machines that cannot run the desktop app at all, including Macs and Chromebooks.',
    ],
    [
      'Is my file uploaded to a server?',
      'No. The file is read by your browser on your own computer and is never sent anywhere. That matters for school files in a way it does not for a holiday photo, so it was built that way on purpose rather than as a promise.',
    ],
    [
      'Which puzzle shapes can it draw?',
      'Standard and extended hexagonal jigsaws, standard triangular jigsaws, domino chains of any length, matching card grids of any size, the 4×4 square jigsaw and the parquet rosette. The last two are drawn from a reconstructed shape, and both the screen and the PDF say so rather than leaving you to find out at the photocopier.',
    ],
    [
      'What happens if my file uses a shape that is not on that list?',
      'It still opens. The questions and answers are read out of it correctly and you are told plainly that there is no layout for that template yet — so you can pour the content into one of the shapes that is supported and print that instead.',
    ],
    [
      'Can I change the questions after opening the file?',
      'Yes. They appear in an editable list beside the puzzle, which redraws as you type, and the PDF prints whatever you changed. Revert to file puts back what was in the file.',
    ],
    [
      'What happens to equations in the file?',
      'They are flattened from MathML to plain text, so a fraction or an index comes through as text rather than as typeset maths. Simple expressions survive this well; heavily formatted ones will need a look before you print.',
    ],
  ],

  'tarsia-for-mac/index.html': [
    [
      'Does Formulator Tarsia run on a Mac?',
      'Not natively. It is a Windows program, and there has never been a Mac build. The same is true of Chromebooks, iPads and Linux machines.',
    ],
    [
      'What about running it through Parallels, Boot Camp or Wine?',
      'They can work, and plenty of teachers have done it. The cost is a Windows licence or an afternoon of configuration, repeated on every machine and after most major macOS updates, for one program that makes worksheets. A web page avoids all of it.',
    ],
    [
      'Will the .fjsw files I already have still work?',
      'Yes. Press Open… and pick one. The file is read on your own machine, and the puzzle is drawn from it as it was in the desktop app.',
    ],
    [
      'Does it work on a Chromebook or an iPad?',
      'Yes. It is a web page with no plugin and no install step, so a managed school Chromebook can use it without anyone touching the device policy.',
    ],
    [
      'What can the desktop app do that this cannot?',
      'It writes .fjsw files, which this does not — it saves its own .tarsia.json instead — and it keeps equations as typeset maths, where the import here flattens them to text. In exchange this runs anywhere, offers puzzle sizes the desktop app never had, and keeps your files on your own machine.',
    ],
  ],

  'what-is-a-tarsia-puzzle/index.html': [
    [
      'What is a Tarsia puzzle?',
      'A set of pieces, usually triangles, that fit together into a larger shape. Each edge carries either a question or an answer, and two pieces may only touch where a question meets the answer that belongs to it. Assembling the shape is therefore the same act as answering every question.',
    ],
    [
      'What subjects is it good for?',
      'Anything that comes in matched pairs. Equations and their solutions, vocabulary and translations, elements and symbols, dates and events, terms and definitions. It is most used in maths and languages because those are richest in pairs, but nothing about the format is subject-specific.',
    ],
    [
      'How many pieces should a puzzle have?',
      'Enough to be work, few enough to finish. A triangle of 16 pieces or a hexagon of 24 suits a single lesson for most classes; smaller shapes work as a starter, and the larger hexagon of 54 pieces is a serious group task rather than an individual one.',
    ],
    [
      'How do you stop students solving it by shape instead of by maths?',
      'Label the outside edges. On a blank-edged puzzle the empty edges give away which pieces belong on the border, which is often enough to finish without answering much. Filling those edges with plausible wrong answers removes the shortcut — the extended hexagon is exactly this, and any tiled shape here can have it switched on.',
    ],
    [
      'How do you print and cut them?',
      'Print the pieces page on card if you can, one copy per group. Cutting is the slowest part, so either set it as the first task of the lesson or cut a class set once and laminate it. The answer sheet prints alongside the pieces so the finished shape can be checked at a glance.',
    ],
  ],
}
