import { useState } from "react";
import { Keyboard, X, Delete } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

type Script = "devanagari" | "gurmukhi" | "latin";

const SCRIPTS: Record<Script, { label: string; keys: string[][] }> = {
  devanagari: {
    label: "हिन्दी",
    keys: [
      ["अ", "आ", "इ", "ई", "उ", "ऊ", "ए", "ऐ", "ओ", "औ"],
      ["क", "ख", "ग", "घ", "च", "छ", "ज", "झ", "ट", "ठ"],
      ["ड", "ढ", "त", "थ", "द", "ध", "न", "प", "फ", "ब"],
      ["भ", "म", "य", "र", "ल", "व", "श", "ष", "स", "ह"],
    ],
  },
  gurmukhi: {
    label: "ਪੰਜਾਬੀ",
    keys: [
      ["ਅ", "ਆ", "ਇ", "ਈ", "ਉ", "ਊ", "ਏ", "ਐ", "ਓ", "ਔ"],
      ["ਕ", "ਖ", "ਗ", "ਘ", "ਚ", "ਛ", "ਜ", "ਝ", "ਟ", "ਠ"],
      ["ਡ", "ਢ", "ਤ", "ਥ", "ਦ", "ਧ", "ਨ", "ਪ", "ਫ", "ਬ"],
      ["ਭ", "ਮ", "ਯ", "ਰ", "ਲ", "ਵ", "ਸ", "ਹ", "ਙ", "ਞ"],
    ],
  },
  latin: {
    label: "Latin",
    keys: [
      ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
      ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
      ["z", "x", "c", "v", "b", "n", "m"],
    ],
  },
};

interface VirtualKeyboardProps {
  onInput: (char: string) => void;
  onDelete: () => void;
  defaultScript?: Script;
}

export function VirtualKeyboard({ onInput, onDelete, defaultScript = "devanagari" }: VirtualKeyboardProps) {
  const [open, setOpen] = useState(false);
  const [script, setScript] = useState<Script>(defaultScript);

  const { keys } = SCRIPTS[script];

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        className="h-7 w-7 text-muted-foreground hover:text-primary transition-colors"
        title="Regional keyboard"
        data-testid="button-virtual-keyboard"
      >
        <Keyboard className="h-4 w-4" />
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] w-[340px] rounded-2xl border border-border/60 bg-background/95 backdrop-blur-xl shadow-2xl p-3"
            data-testid="virtual-keyboard-panel"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-1">
                {(Object.keys(SCRIPTS) as Script[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setScript(s)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all ${
                      script === s
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                    data-testid={`keyboard-script-${s}`}
                  >
                    {SCRIPTS[s].label}
                  </button>
                ))}
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="space-y-1">
              {keys.map((row, rowIdx) => (
                <div key={rowIdx} className="flex justify-center gap-0.5 flex-wrap">
                  {row.map((char) => (
                    <button
                      key={char}
                      onClick={() => onInput(char)}
                      className="h-8 min-w-[28px] px-1.5 rounded-lg bg-muted/60 hover:bg-primary/10 hover:text-primary border border-border/30 hover:border-primary/30 text-[13px] font-medium transition-all active:scale-95"
                      data-testid={`vk-key-${char}`}
                    >
                      {char}
                    </button>
                  ))}
                </div>
              ))}

              <div className="flex gap-1 mt-1.5">
                <button
                  onClick={() => onInput(" ")}
                  className="flex-1 h-8 rounded-lg bg-muted/60 hover:bg-muted border border-border/30 text-[11px] font-bold text-muted-foreground uppercase tracking-wider transition-all"
                >
                  Space
                </button>
                <button
                  onClick={onDelete}
                  className="h-8 px-3 rounded-lg bg-muted/60 hover:bg-destructive/10 hover:text-destructive border border-border/30 transition-all flex items-center justify-center"
                  data-testid="vk-delete"
                >
                  <Delete className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
