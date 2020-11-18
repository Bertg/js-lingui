import fs from "fs"
import path from "path"
import mockFs from "mock-fs"
import mockDate from "mockdate"
import PO from "pofile"
import { mockConsole } from "@lingui/jest-mocks"

import format from "./po"
import { CatalogType } from "../catalog"

describe("pofile format", function () {
  afterEach(() => {
    mockFs.restore()
    mockDate.reset()
  })

  it("should write catalog in pofile format", function () {
    mockFs({
      locale: {
        en: mockFs.directory(),
      },
    })
    mockDate.set(new Date(2018,7,27,10,0,0).toUTCString())

    const filename = path.join("locale", "en", "messages.po")
    const catalog: CatalogType = {
      static: {
        id: "static",
        translation: "Static message",
      },
      withOrigin: {
        id: "withOrigin",
        translation: "Message with origin",
        origin: [["src/App.js", 4]],
      },
      withMultipleOrigins: {
        id: "withMultipleOrigins",
        translation: "Message with multiple origin",
        origin: [
          ["src/App.js", 4],
          ["src/Component.js", 2],
        ],
      },
      withDescription: {
        id: "withDescription",
        translation: "Message with description",
        extractedComments: ["Description is comment from developers to translators"],
      },
      withComments: {
        id: "withComments",
        comments: ["Translator comment", "This one might come from developer"],
        translation: "Support translator comments separately",
      },
      withContext: {
        id: "withContext",
        context: "Support context",
        translation: "Support translator context separately",
      },
      obsolete: {
        id: "obsolete",
        translation: "Obsolete message",
        obsolete: true,
      },
      withFlags: {
        id: "withFlags",
        flags: ["fuzzy", "otherFlag"],
        translation: "Keeps any flags that are defined",
      },
      veryLongString: {
        id: "veryLongString",
        translation:
          "One morning, when Gregor Samsa woke from troubled dreams, he found himself" +
          " transformed in his bed into a horrible vermin. He lay on his armour-like" +
          " back, and if he lifted his head a little he could see his brown belly," +
          " slightly domed and divided by arches into stiff sections. The bedding was" +
          " hardly able to cover it and seemed ready to slide off any moment. His many" +
          " legs, pitifully thin compared with the size of the rest of him, waved about" +
          " helplessly as he looked. \"What's happened to me?\" he thought. It wasn't" +
          " a dream. His room, a proper human",
      },
    }

    format.write(filename, catalog, { origins: true, locale: "en" })
    const pofile = fs.readFileSync(filename).toString()
    mockFs.restore()
    expect(pofile).toMatchSnapshot()
  })

  it("should read catalog in pofile format", function () {
    const pofile = fs
      .readFileSync(
        path.join(path.resolve(__dirname), "fixtures", "messages.po")
      )
      .toString()

    mockFs({
      locale: {
        en: {
          "messages.po": pofile,
        },
      },
    })

    const filename = path.join("locale", "en", "messages.po")
    const actual = format.read(filename)
    mockFs.restore()
    expect(actual).toMatchSnapshot()
  })

  it("should correct badly used comments", function () {
    const po = PO.parse(`
      #. First description
      #. Second comment
      #. Third comment
      msgid "withMultipleDescriptions"
      msgstr "Extra comments are separated from the first description line"

      # Translator comment
      #. Single description only
      #. Second description?
      msgid "withDescriptionAndComments"
      msgstr "Second description joins translator comments"
    `)

    mockFs({
      locale: {
        en: {
          "messages.po": po.toString(),
        },
      },
    })

    const filename = path.join("locale", "en", "messages.po")
    const actual = format.read(filename)
    mockFs.restore()
    expect(actual).toMatchSnapshot()
  })

  it("should throw away additional msgstr if present", function () {
    const po = PO.parse(`
      msgid "withMultipleTranslation"
      msgstr[0] "This is just fine"
      msgstr[1] "Throw away that one"
    `)

    mockFs({
      locale: {
        en: {
          "messages.po": po.toString(),
        },
      },
    })

    const filename = path.join("locale", "en", "messages.po")
    mockConsole((console) => {
      const actual = format.read(filename)
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("Multiple translations"),
        "withMultipleTranslation"
      )
      mockFs.restore()
      expect(actual).toMatchSnapshot()
    })
  })

  it("should write the same catalog as it was read", function () {
    const pofile = fs
      .readFileSync(
        path.join(path.resolve(__dirname), "fixtures", "messages.po")
      )
      .toString()

    mockFs({
      locale: {
        en: {
          "messages.po": pofile,
        },
      },
    })

    const filename = path.join("locale", "en", "messages.po")
    const catalog = format.read(filename)
    format.write(filename, catalog, { origins: true, locale: "en" })
    const actual = fs.readFileSync(filename).toString()
    mockFs.restore()
    // on windows mockFs adds ··· to multiline string, so this strictly equal comparison can't be done
    // we test that the content if the same inlined...
    expect(actual.replace(/(\r\n|\n|\r)/gm,"")).toEqual(pofile.replace(/(\r\n|\n|\r)/gm,""))
  })

  it("should not include origins if origins option is false", function () {
    mockFs({
      locale: {
        en: mockFs.directory(),
      },
    })

    const filename = path.join("locale", "en", "messages.po")
    const catalog: CatalogType = {
      static: {
        translation: "Static message",
      },
      withOrigin: {
        translation: "Message with origin",
        origin: [["src/App.js", 4]],
      },
      withMultipleOrigins: {
        translation: "Message with multiple origin",
        origin: [
          ["src/App.js", 4],
          ["src/Component.js", 2],
        ],
      },
    }
    format.write(filename, catalog, { origins: false, locale: "en" })
    const pofile = fs.readFileSync(filename).toString()
    mockFs.restore()
    const pofileOriginPrefix = "#:"
    expect(pofile).toEqual(expect.not.stringContaining(pofileOriginPrefix))
  })
})
