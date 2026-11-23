# Files of an HTML page

This doc holds the requirements and the decisions in force for the files
that the page of an HTML file can load from the files preview. It belongs
to [HTML file preview](html-file-preview.md), which covers the tab of an
HTML file and the files preview. [File server](file-server.md) gives the
rules of the file server that serves these files. The terms are those of
[HTML file preview](html-file-preview.md#terms) and of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. An HTML preview decision number names a decision of the change that
shows HTML files rendered. A sandbox files decision number names a
decision of the change that shows agent pages with their files and fonts.

## Which files a page can load

- The files preview serves each file that a file tab can read, except dot
  files (HTML preview decision 2 D). That is each regular file of the
  workspace's repository folder, also a file that Git ignores, outside
  `.git`, through links that stay inside the folder.
- A file in a folder whose name starts with a dot still loads. A link
  whose target is a dot file does not load. Reason: a link named
  `config.txt` that leads to `.env` must not give the page that content.
- Reason: one files preview, so one origin, serves every HTML file of the
  workspace. A script of a page can read each file that the files preview
  serves, and send it to another site. Option D serves almost every page
  that the option with dot files serves, and it keeps files such as `.env`
  and `.npmrc` away from each page, as common static servers do.
- Risk: a page that loads a dot file breaks. A secret in a file with
  another name, such as `key.pem`, stays readable by the script of a page.
- These options of HTML preview decision 2 were not chosen:
  - Each file that a file tab can read, also dot files. A script of an
    untrusted page could then send `.env` to another site.
  - Only the files that All files lists. A page that loads ignored build
    output breaks, and an ignored page, such as `coverage/index.html`,
    cannot show.
  - A files preview with its own hostname for each previewed folder. A
    workspace gets several files previews, a page that loads `../assets/`
    breaks, and a page at the top of the repository still reaches each file.
  - The values of the secret env vars hidden in each reply. It protects
    only those values, and a page whose script holds such a value breaks.
  - A setting of each repository that chooses, because it needs a new
    setting with its screens and its storage.
- These ways were rejected:
  - Only the folder of the HTML file and the folders below it, with one
    files preview, because the file server sees only the path.
  - A content security policy that blocks requests to other sites, because
    it breaks pages that load a library from another site, and a
    navigation can still carry the data away.
  - A frame with no origin of its own, because module scripts, fonts, and
    fetch calls then send no preview cookie.
  - A press before the page runs its scripts, or a notice of the files
    that a page read, because the page reads the files after the press,
    and a notice comes after the file left.
- The files of other repositories and of the home folder stay out. All
  files never shows them, and the home folder holds the files of the app's
  own software.
- A page can also load a file of the repository folder by its absolute
  path. A local `file:` address in an HTML, CSS, or SVG file loads it too.
  The page can also load the system fonts (sandbox files decision 1 D).
- Each HTML page loads a stylesheet of the system fonts, except in the
  cases below. So a page that names a font of the cloud computer by its
  family, such as C059, shows that font.
  [The font stylesheet link](file-server-fonts.md#the-font-stylesheet-link) gives
  the rules, and [Local file addresses](file-server.md#local-file-addresses)
  gives the rules of the addresses.
- Reason: agents check a page in the browser of the cloud computer, from a
  `file://` address. The member's browser loads no `file://` address from
  the files preview, and the member's computer lacks the fonts of the cloud
  computer. Option D shows such a page as the agent saw it. It needs no
  step from the agent, so it also fixes the pages that agents wrote before.
- These options of sandbox files decision 1 were not chosen:
  - A rule in the repository's `CLAUDE.md` or in the org skills. Only that
    repository or org gets it, and an agent can skip it.
  - A rule in the agent instructions: relative addresses, and a copy of
    each font beside the page. An agent can skip it, and older pages stay
    broken.
  - A `conductive` command that makes a page portable, which the agent
    instructions name. An agent can skip it, and older pages stay broken.
  - Only the changes of the addresses, with no system fonts. A page that
    names a font of the cloud computer then shows another font.
  - A second view of the tab with a picture that the cloud computer
    renders. The picture has no scripts, links, or text selection.
- Risk: a script of a page can read each system font that the files
  preview serves, and send it to another site. It can also read the
  stylesheet, which lists each such font. Fonts from system packages are
  public. A licensed font that an org installs in those folders is readable
  too.
- Risk: on some images, the user of the cloud computer owns
  `/usr/local/share`, so a process of the user can add a file there. Such
  a process can also write into the repository folder, so this risk is of
  the same kind.
- In these cases, a page does not show as the agent saw it:
  - It loads a file outside the repository folder that is not a system
    font.
  - It uses a font of the home folder outside the repository folder, such
    as a font in `~/.local/share/fonts`.
  - It loads a file by a `file:` address that a script builds while the
    page runs, or that a `.js`, `.mjs`, or `.json` file holds. An absolute
    path in the repository folder that a script builds does load.
  - It names a generic family, such as `sans-serif`, or a fontconfig alias,
    such as Helvetica. The cloud computer shows Helvetica as Nimbus Sans.
  - It shows an SVG document or an SVG picture. The SVG gets no system
    fonts.
  - It defines a family that the cloud computer also has, and the browser
    picks a system face of that family for some text, such as bold text.
    [The font stylesheet link](file-server-fonts.md#the-font-stylesheet-link)
    says when.
  - The file server adds no link to the font stylesheet, so the page gets
    no system fonts by family.
    [The font stylesheet link](file-server-fonts.md#the-font-stylesheet-link)
    gives these pages.
