/* globals jasmine */
global.requestAnimationFrame = function(callback) {
  setTimeout(callback, 0)
}

const Enzyme = require("enzyme")
const Adapter = require("enzyme-adapter-react-16")
Enzyme.configure({ adapter: new Adapter() })

const stripAnsi = require("strip-ansi")

expect.addSnapshotSerializer({
  test: val => typeof val === "string",
  print: val => stripAnsi(val)
})
