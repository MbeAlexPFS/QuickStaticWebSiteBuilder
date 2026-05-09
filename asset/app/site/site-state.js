// site/site-state.js
// Global state declarations + DOM cache (from make_site.js)

let globalJSFiles = [];
let globalCSSFiles = [];
let sitePages = [];

let componentData = {};
let libData = {};

let library = [];
const requiredLibrary = new Set();

let selectedPage = "";
let selectedElement = "";
let copiedElement = [];
let selectedComponent = "";
let editorInputID = "";
let componentRootID = [];

let monacoEditorInstance = null;
let monacoReady = false;

let renderCSSPerComponentCache = {};
let renderJSPerComponentCache = {};
let record = 0;

let monArbre = null;

const element = {
  site: $("#site-form"),
  page: $("#site-page-editor"),
};

const elPageEditor = {
  view: $("#page-view"),
  form: $("#element-form"),
  root: $("#root-form"),
  selected: $("#selected-element"),
  selectedComponent: $("#selected-component"),
  toInitRoot: $("#to-init-root"),
  emptyParam: $("#element-empty-param"),
  emptyParamForm: $("#form-empty-param"),
  paramForm: $("#element-param-form"),
  anim: $("#element-onview-anim"),
  component: $("#component-selector"),
  copied: $("#copied-element"),
  copiedForm: $("#element-copied-form"),
  viewed: $("#page"),
  realView: $("#realview"),
  addLib: $("#lib-add"),
  searchLib: $("#lib-search"),
  tagName: $("#element-tag-name"),
};
