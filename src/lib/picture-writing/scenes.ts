// What each picture-writing photo shows, for the AI marker only (server-side;
// never imported by browser code). These are observations, not a model
// answer: the candidate's own reasonable reading of the scene is accepted.

export interface PictureScene {
  /** One or two sentences: what can be seen. */
  scene: string;
  /** Visible details a careful observer could mention. */
  details: string[];
  /** Reasonable readings of the situation (any sensible one is fine). */
  readings: string[];
}

export const PICTURE_SCENES: Record<string, PictureScene> = {
  "cafe-payment": {
    scene: "A smiling young woman in a black apron, hair in a bun, stands behind a café counter. A customer with long fair hair, seen from behind, holds out a bank card or phone near a card machine.",
    details: ["black denim apron", "card machine / till on the counter", "café shelves and kitchen area behind", "the staff member is smiling", "customer seen from behind"],
    readings: ["a customer paying for an order", "friendly service at the end of a sale", "next: receipt, order handed over, customer leaves or waits for a drink"],
  },
  "cafe-menu": {
    scene: "At a café counter, a customer with dark hair (seen from behind) holds up a printed menu and appears to be asking about it. A woman in a pale blue shirt behind the counter leans on it and listens with a serious, attentive expression.",
    details: ["printed menu in the customer's hand", "chalkboard menus on the wall (drinks and food)", "coffee machine and grinder behind the counter", "a small 'gift card' sign on the counter", "staff member's hands resting on the counter"],
    readings: ["the customer has a question, a special request or a complaint about an item or price", "the staff member is listening before answering", "next: she explains, recommends or fixes the order"],
  },
  "shop-receipt": {
    scene: "A middle-aged shopkeeper in a brown apron and blue shirt smiles while handing a card or receipt to a customer in a teal top, seen from behind, in a small shop.",
    details: ["brown apron", "shelves with products behind him", "a card or receipt being passed between hands", "the shopkeeper is smiling and looking at the customer", "bright light from a window"],
    readings: ["the end of a purchase: returning the card or giving a receipt", "a friendly local shop with regular customers", "next: the customer leaves, perhaps after a short chat"],
  },
  "bakery-counter": {
    scene: "In a bright, modern café or bakery, a young woman in a cream knitted vest stands at the counter talking to a young man in a white shirt and red tie who is serving behind it. Another person sits in a wheelchair at the right edge of the counter.",
    details: ["white shirt and red tie on the staff member", "plant and paper cups on the counter", "glass display case", "large windows and a light, clean interior", "a third person at the right edge"],
    readings: ["a customer placing an order or asking a question", "polite, relaxed service", "next: the order is prepared or paid for"],
  },
  "flipchart-meeting": {
    scene: "In a small meeting room, a woman in a light blue shirt stands at a flipchart and writes or points at a chart. Three or four colleagues sit around a table with a laptop and papers, turned towards her.",
    details: ["flipchart on a stand", "laptop and notebooks on the table", "people seated, facing the presenter", "brick wall and glass partition", "one man in a dark blue jacket in the foreground"],
    readings: ["a presentation, training or planning session", "the presenter explaining results or a plan", "next: questions, discussion and agreeing actions"],
  },
  "glass-board": {
    scene: "Seen through a glass wall covered in pastel sticky notes and handwritten marks, a small team stands and sits close together; a man in the middle looks at the notes while a woman beside him leans in.",
    details: ["sticky notes in several colours on the glass", "handwritten formula or symbols on the glass", "people partly blurred behind the glass", "an informal, focused group", "the photo is taken from the other side of the glass"],
    readings: ["a brainstorming or problem-solving session", "the team is organising ideas or tasks", "next: they choose ideas and assign actions"],
  },
  "warehouse-check": {
    scene: "A young woman in a cap and dark quilted jacket stands among stacked cardboard boxes and looks down at a tablet or phone, checking something.",
    details: ["many cardboard boxes with labels", "a cap and padded jacket", "tablet or phone in her hands", "warehouse or stockroom setting", "she is focused, not smiling"],
    readings: ["checking stock, an order or a delivery list", "making sure the right parcels go out", "next: she finds or marks a box, or reports a missing item"],
  },
  "van-delivery": {
    scene: "At the open back of a white delivery van full of cardboard boxes, a man in a white polo shirt and cap carries a box while a woman in a white cap holds a tablet and checks it.",
    details: ["open rear doors of a white van", "many boxes stacked inside", "man carrying a box", "woman with a tablet", "outdoors, daylight"],
    readings: ["loading or unloading deliveries", "checking parcels against a list", "next: boxes are delivered or the van leaves on its route"],
  },
  "clinic-reception": {
    scene: "At a clean, white clinic reception desk, a woman in a white uniform with her hair tied back leans over the counter, pointing at a document. A young woman in a checked shirt and a young man stand on the other side and look at it.",
    details: ["white reception counter", "white medical uniform", "a form or document on the counter", "two visitors looking at the paper", "modern, clean interior"],
    readings: ["patients registering or filling in a form", "staff explaining an appointment, form or bill", "next: they sign, are given a time, or are sent to the waiting area"],
  },
  "screen-surprise": {
    scene: "In an open-plan office, a fair-haired man in a dark suit sits at a computer with his hand on the mouse, looking at the screen with a surprised or concerned expression. A woman works at the desk behind him.",
    details: ["two monitors and a keyboard", "dark suit and white shirt", "surprised or worried face", "shelves of files in the background", "colleague working nearby"],
    readings: ["he has seen an unexpected email, error or result", "something may need urgent action", "next: he checks the problem, asks a colleague or informs a manager"],
  },
  "site-plans": {
    scene: "Inside a building under construction, two workers in white hard hats look closely at sheets of paper. One wears blue overalls and a face covering; the other wears a red top with a safety harness.",
    details: ["white hard hats", "papers or drawings in their hands", "scaffolding and pipes in the background", "safety harness and gloves", "unfinished interior"],
    readings: ["checking plans or a work order", "discussing the next step or a problem on site", "next: they agree what to do and go back to work"],
  },
  "site-team": {
    scene: "Six people in white hard hats and yellow high-visibility vests lean over a table covered with large plans and a laptop. One points at the plans while the others look.",
    details: ["yellow high-visibility vests", "white hard hats with a logo", "large drawings on the table", "open laptop", "one person pointing"],
    readings: ["a site team planning work or solving a design problem", "a supervisor explaining the plan", "next: tasks are shared out"],
  },
  "repair-workshop": {
    scene: "In a cluttered workshop with shelves full of old equipment, a man in glasses and a teal T-shirt bends over a workbench and works on a machine with a round metal blade.",
    details: ["shelves crowded with devices and tools", "a machine with a round blade on the bench", "his glasses and teal T-shirt", "concentrated posture", "workshop lighting"],
    readings: ["repairing or servicing a machine", "finding the cause of a fault", "next: he tests the machine or orders a part"],
  },
  "doctor-nurse": {
    scene: "In a hospital corridor, an older doctor in a white coat, glasses and a patterned tie holds a yellow folder, while a nurse in blue scrubs speaks to him and points at it.",
    details: ["white coat and patterned tie", "blue scrubs", "yellow folder", "light blue hospital wall", "the nurse is talking; the doctor is listening"],
    readings: ["the nurse updating the doctor about a patient", "discussing a result or a change in treatment", "next: the doctor decides what to do or goes to see the patient"],
  },
  boardroom: {
    scene: "In a formal meeting room with a long wooden table, three people in dark suits sit close together looking at a laptop. Papers and glasses of water are on the table.",
    details: ["long wooden table", "dark business suits", "laptop shared between them", "papers and water glasses", "wood-panelled wall and a screen"],
    readings: ["reviewing a proposal, contract or figures", "preparing for a client or board meeting", "next: they agree a decision or changes"],
  },
  "desk-help": {
    scene: "In a bright office, a woman with curly hair works at a computer while a colleague in a green sweater and glasses leans in, smiling, to look at her screen. Another colleague smiles in the background.",
    details: ["computer monitor and keyboard", "green chairs", "the colleague leaning in", "smiling, relaxed faces", "an open office with other desks"],
    readings: ["a colleague helping or explaining something on screen", "teamwork or training a new employee", "next: she finishes the task or he shows the next step"],
  },
  "loft-meeting": {
    scene: "In a bright office with large windows and white brick walls, an older man in a white shirt stands and leans over the table, speaking to four seated colleagues who have laptops.",
    details: ["large black-framed windows", "white brick wall", "laptops open on the table", "the older man is standing", "colleagues listening"],
    readings: ["a manager or mentor giving guidance", "a team meeting about a project", "next: questions, then the team works on the plan"],
  },
  "clinic-chat": {
    scene: "In a bright waiting area with grey sofas, a woman in a light top and jeans stands facing a woman in blue-grey scrubs, who holds a sheet of paper and talks to her.",
    details: ["grey sofas", "scrubs on one woman", "a sheet of paper in her hand", "both standing", "a calm, clean room"],
    readings: ["a nurse or receptionist explaining instructions or results", "a visitor asking for information", "next: the visitor is shown where to go or what to do"],
  },
};
