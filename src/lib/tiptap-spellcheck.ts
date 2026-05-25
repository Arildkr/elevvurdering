import { Extension } from "@tiptap/core";

export const SpellCheck = Extension.create({
  name: "spellCheck",

  addOptions() {
    return {
      enabled: false,
    };
  },

  addStorage() {
    return {
      enabled: false,
    };
  },
});
