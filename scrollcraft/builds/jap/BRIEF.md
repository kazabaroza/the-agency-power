# JAP · Brief

**Self-authored under explicit creative delegation.** The client answered five
of the questions and wrote "כל השאר תחליט אתה" (decide the rest yourself).
Their answers are quoted word for word. Everything marked *Authored* was
decided by Claude.

## The interview

1. **Vibe.** Client: "מידבר, שקיעה" (desert, sunset).
   *Authored* additions: warm, slow, intimate, expensive. References: the last
   twenty minutes of light in a desert (Wadi Rum, Arava), the colour of amber
   glass held up to a low sun, a perfume print ad with one word on it.
2. **The journey, in the client's words.** Client on the product: "שמן חוחובה
   אורגני באריזה יוקרתית עם כל הסגולות של השמן". *Authored* sequence below.
3. **Energy curve.** *Authored*: calm open, rising curiosity, one held moment,
   then confident and quiet to the end. Nothing loud.
4. **Feeling, and the one moment.** Client: "תחושה של ליטוף יוקרתי" (the feeling
   of a luxurious caress). *Authored* peak: one golden drop falls and lands.
5. **The thing no other site does.** *Authored*: the visitor's own hand leaves
   a warm golden sheen on the page, like oil on skin, which slowly soaks in and
   disappears. That is the caress, given to the visitor to perform.
6. **Distance from premium-minimal.** *Authored*: editorial-luxury. Close to
   minimal, but with type at poster scale.
7. **One world or distinct scenes.** *Authored*: distinct scenes on one
   darkening ground. The sun sets as you scroll, so it still feels like one
   evening.
8. **Assets.** One small product photo (336×192: amber bottle with a black
   dropper, desert). Too small for any full-screen use. No kie.ai key, so no
   generated imagery. Everything visual is drawn in code (SVG and CSS).

### Product facts (from the client)
- What it is: organic jojoba oil in luxury packaging.
- Belief at the end, client's words: "jap הוא סופר פוד אורגני לעורך שהולך איתך
  לכל מקום ומטפל בך" (JAP is an organic superfood for your skin that goes
  everywhere with you and takes care of you).
- Action: buy ("לקנות"). One label everywhere: **לרכישה** / **Shop JAP**.
- Languages: Hebrew and English. Hebrew is the default (RTL), with a toggle.

### Claims used, and their basis
General, well-documented properties of jojoba. None are specific to JAP's
process, because none were supplied:
- Jojoba "oil" is technically a liquid wax (wax esters).
- Its structure is close to human sebum.
- It contains vitamin E (tocopherols).
- It is unusually resistant to oxidation, so it keeps for a long time.
- It is commonly described as non-comedogenic.
- It can be used on face, body, hair, beard and nails.

**No invented numbers, prices, volumes, reviews, certifications or
processing claims** (such as "cold-pressed"). The client should confirm the
organic certification wording and supply the real shop URL.

## The journey
1. Arrival: they see the evening, and the bottle standing in it.
2. Origin: it comes from the desert, a plant that keeps everything inside.
3. Turn: it isn't really an oil. Skin recognises it.
4. Peak: one drop. A caress.
5. Substance: what it does, in a few plain facts.
6. Commitment: quiet, night has fallen, one link.

## Feeling curve
| Act | Feeling | What causes it |
|---|---|---|
| 1 Arrival | Stillness, warmth | Low sun, dunes moving at different depths, JAP standing between them |
| 2 Origin | Wonder | The word "desert" closing in from huge, slowly, as the sun goes down |
| 3 Turn | Surprise | A plain sentence that overturns what they assumed |
| 4 Peak | Being touched | One drop forms, falls and lands, and the word "caress" opens around it |
| 5 Substance | Trust | Short facts at very different sizes, nothing shouted |
| 6 Close | Calm, resolved | Night ground, the smallest type on the page, one link |

**The peak:** "There's this one drop that falls and lands, and the whole page
goes soft." It lives in Act 4 and gets the longest span on the page.

**Tell-someone sentence:** "It's the site where you run your finger over it
and it leaves a golden sheen, like the oil is on your skin."

**Authored silence:** the first ~45% of Act 4 is on purpose. The drop is
slowly gathering at the tip, and nothing else moves.

## Grammar: typographic poster
Why it won:
- **Filmic one-shot:** needs scrub footage. There is none, and no budget to
  generate it.
- **Chaptered editorial:** the substance is a few facts, not an essay.
- **Live surface:** there is no software to demonstrate.
- **Continuous world:** needs generated flight video.
- **Gallery:** there is one product, not a range.
- **Split stage:** there is no two-sided argument.
- **Rhythmic cutlist:** fast cuts are the opposite of a caress.
- **Poster:** fits a brand whose asset is a feeling and a few words, and has
  almost no photography. Type carries the imagery. The desert is the ground,
  drawn as graphic planes, not as a photograph.

## Signature move
**The sheen.** Pointer or finger movement anywhere on the page paints a soft
golden sheen that lingers and then soaks away over about two seconds. It is
stronger over the night grounds, where it reads like light on oil. It is coded
in the page, the engine is untouched, and it is off under reduced motion.

## Score
| Act | Beat | Device | Span |
|---|---|---|---|
| 1 | Arrival | `flow` + layered `parallax` (sky, sun, far dune, JAP wordmark, mid dune with bottle, foreground dune at 1x) | 1 screen |
| 2 | Origin | `pin` with scale driven from `--sc-p` | 2.0 |
| 3 | Turn | `flow` + `reveal` across the letterforms | flow |
| 4 | Peak | `pin` + bespoke drop driven from `--sc-p` + `kinetic` words | 3.4 (largest) |
| 5 | Substance | `flow` + `in`, scale contrast | flow |
| 6 | Close | short `pin`, held cue, inverted to the smallest type | 1.3 |

Ground drift: ember → dusk rose → plum → night. Same warm-dark family
throughout.
