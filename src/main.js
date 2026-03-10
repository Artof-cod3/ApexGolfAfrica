// app.js
// Data
const clubs = [
  { id: 1, name: "Karen Country Club", location: "Karen, Nairobi" },
  { id: 2, name: "Muthaiga Golf Club", location: "Muthaiga, Nairobi" },
  { id: 3, name: "Vipingo Ridge", location: "Kilifi, Coast" },
  { id: 4, name: "Vetlab Sports Club", location: "Westlands, Nairobi" },
  { id: 5, name: "Limuru Country Club", location: "Limuru, Kiambu" },
  { id: 6, name: "Great Rift Valley Lodge", location: "Naivasha" }
];

const caddies = [
  { id: 1, name: "James Mwangi", specialty: "Karen & Muthaiga specialist", exp: "6 yrs experience", rating: 4.9, rounds: 312, topRated: true, initials: "JM", color: "bg-green-900" },
  { id: 2, name: "Peter Otieno", specialty: "Vipingo Ridge expert", exp: "Coastal course knowledge", rating: 4.8, rounds: 247, topRated: false, initials: "PO", color: "bg-yellow-800" },
  { id: 3, name: "Grace Wanjiku", specialty: "All-clubs", exp: "Fluent English & Swahili", rating: 5.0, rounds: 198, topRated: true, initials: "GW", color: "bg-blue-900" },
  { id: 4, name: "David Kipchoge", specialty: "Rift Valley specialist", exp: "First aid certified", rating: 4.7, rounds: 156, topRated: false, initials: "DK", color: "bg-stone-800" }
];

const equipment = [
  { id: 1, name: "TaylorMade Stealth Set", brand: "TaylorMade", desc: "Driver, woods, irons (5-PW), wedge, putter - full bag included", price: 4000 },
  { id: 2, name: "Callaway Paradym Set", brand: "Callaway", desc: "Driver, fairway woods, irons (4-SW), putter - carry bag included", price: 4000 },
  { id: 3, name: "Ping G430 Set", brand: "Ping", desc: "Driver, 3-wood, hybrid, irons (5-PW), wedge, putter - tour bag", price: 4000 }
];

const teeTimes = ["06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "14:00"];

// State
let state = {
  step: 1,
  showSuccess: false,
  bookingRef: '',
  clubId: null,
  date: '',
  players: 1,
  time: '',
  caddieId: null,
  selectedEquipment: [],
  delivery: { type: 'club', cost: 0 },
  addons: { photo: false, video: false },
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  nationality: '',
  shoeSize: '',
  requests: '',
  bookings: []
};

// DOM Elements
const root = document.getElementById('root');

// Helper Functions
function calculateTotal() {
  let total = 3500 * state.players;
  state.selectedEquipment.forEach(item => {
    const eq = equipment.find(e => e.id === item.id);
    if (eq) total += eq.price * item.qty;
  });
  total += state.delivery.cost;
  if (state.addons.photo) total += 2500;
  return total;
}

function updateEquipment(id, change) {
  const existing = state.selectedEquipment.find(item => item.id === id);
  if (existing) {
    existing.qty += change;
    if (existing.qty <= 0) {
      state.selectedEquipment = state.selectedEquipment.filter(item => item.id !== id);
    }
  } else if (change > 0) {
    state.selectedEquipment.push({ id, qty: 1 });
  }
  render();
}

function nextStep() {
  if (state.step < 5) {
    state.step++;
    render();
  }
}

function prevStep() {
  if (state.step > 1) {
    state.step--;
    render();
  }
}

function canProceed() {
  switch(state.step) {
    case 1: return state.clubId && state.date && state.time;
    case 2: return state.caddieId;
    case 3: return true;
    case 4: return state.firstName && state.lastName && state.email && state.phone && state.nationality;
    default: return true;
  }
}

function handleSubmit() {
  const newBooking = {
    id: Date.now(),
    firstName: state.firstName,
    lastName: state.lastName,
    email: state.email,
    phone: state.phone,
    nationality: state.nationality,
    clubId: state.clubId,
    date: state.date,
    time: state.time,
    players: state.players,
    caddieId: state.caddieId,
    equipment: state.selectedEquipment,
    delivery: state.delivery,
    addons: state.addons,
    total: calculateTotal(),
    status: 'confirmed',
    createdAt: new Date().toISOString()
  };
  
  state.bookings.push(newBooking);
  state.bookingRef = 'APX-' + Math.floor(10000 + Math.random() * 90000);
  state.showSuccess = true;
  render();
}

function reset() {
  state = {
    step: 1,
    showSuccess: false,
    bookingRef: '',
    clubId: null,
    date: '',
    players: 1,
    time: '',
    caddieId: null,
    selectedEquipment: [],
    delivery: { type: 'club', cost: 0 },
    addons: { photo: false, video: false },
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    nationality: '',
    shoeSize: '',
    requests: '',
    bookings: state.bookings
  };
  render();
}

// Render Functions
function render() {
  if (state.showSuccess) {
    renderSuccess();
    return;
  }

  root.innerHTML = `
    <div class="w-full min-h-screen bg-gray-50 flex flex-col">
      ${renderStatusBar()}
      ${renderHeader()}
      ${renderHero()}
      ${renderStepper()}
      ${renderMainContent()}
      ${renderFooter()}
    </div>
  `;
}

function renderStatusBar() {
  return `
    <div class="bg-black text-white px-6 py-2 flex justify-between items-center text-xs font-medium">
      <span>07:33</span>
      <div class="flex items-center gap-1">
        <span class="text-[10px]">5G</span>
        <i class="fas fa-signal text-[10px]"></i>
        <i class="fas fa-battery-full ml-1 text-[10px]"></i>
      </div>
    </div>
  `;
}

function renderHeader() {
  return `
    <header class="bg-apex-dark text-white px-4 py-4 flex justify-between items-center shadow-md">
      <button class="w-8 h-8 rounded-full border border-gray-600 flex items-center justify-center hover:bg-white/10 transition">
        <span class="text-sm">×</span>
      </button>
      <h1 class="text-sm font-medium tracking-wide">apexgolf booking</h1>
      <button class="w-8 h-8 rounded-full border border-gray-600 flex items-center justify-center hover:bg-white/10 transition">
        <span class="text-sm">⋯</span>
      </button>
    </header>
  `;
}

function renderHero() {
  return `
    <div class="bg-apex-dark text-white px-6 pt-6 pb-8 relative overflow-hidden shrink-0">
      <div class="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none bg-gradient-to-br from-green-900 to-black"></div>
      <div class="relative z-10">
        <div class="flex items-center gap-2 mb-2 opacity-80">
          <span class="font-serif italic text-lg text-apex-gold">ApexGolf</span>
          <span class="text-xs uppercase tracking-widest">Africa</span>
          <span class="ml-auto text-xs flex items-center gap-1 cursor-pointer hover:text-apex-gold">← Back to website</span>
        </div>
        <h2 class="font-serif text-3xl leading-tight mb-2">Book Your <span class="text-apex-gold italic">Apex</span> Experience</h2>
        <p class="text-gray-300 text-xs leading-relaxed max-w-[80%]">
          Certified caddies · Equipment hire · Professional photography — all in one booking
        </p>
      </div>
    </div>
  `;
}

function renderStepper() {
  return `
    <div class="bg-white px-4 py-4 shadow-sm shrink-0">
      <div class="flex items-center justify-between text-[10px] font-medium text-gray-500 uppercase tracking-wider">
        <div class="flex flex-col items-center gap-1 w-1/3">
          <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all ${state.step >= 1 ? 'bg-apex-dark text-white' : 'bg-gray-200 text-gray-400'}">1</div>
          <span class="${state.step >= 1 ? 'text-apex-dark' : ''}">Club & Date</span>
        </div>
        <div class="h-px bg-gray-200 flex-1 mb-4"></div>
        <div class="flex flex-col items-center gap-1 w-1/3">
          <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all ${state.step >= 2 ? 'bg-apex-dark text-white' : 'bg-gray-200 text-gray-400'} ${state.step > 2 ? 'bg-apex-gold' : ''}">2</div>
          <span class="${state.step >= 2 ? 'text-apex-dark' : ''}">Choose Caddie</span>
        </div>
        <div class="h-px bg-gray-200 flex-1 mb-4"></div>
        <div class="flex flex-col items-center gap-1 w-1/3">
          <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all ${state.step >= 3 ? 'bg-apex-dark text-white' : 'bg-gray-200 text-gray-400'}">3</div>
          <span class="${state.step >= 3 ? 'text-apex-dark' : ''}">Equipment</span>
        </div>
      </div>
    </div>
  `;
}

function renderMainContent() {
  let content = '';
  
  switch(state.step) {
    case 1:
      content = renderStep1();
      break;
    case 2:
      content = renderStep2();
      break;
    case 3:
      content = renderStep3();
      break;
    case 4:
      content = renderStep4();
      break;
    case 5:
      content = renderStep5();
      break;
  }
  
  return `<div class="flex-1 overflow-y-auto bg-gray-50 hide-scrollbar">${content}</div>`;
}

function renderStep1() {
  const clubsHtml = clubs.map(c => `
    <div 
      onclick="selectClub(${c.id})"
      class="cursor-pointer border ${state.clubId === c.id ? 'border-apex-gold bg-yellow-50/50' : 'border-gray-100'} rounded-xl p-4 flex items-start gap-3 transition hover:shadow-md relative overflow-hidden"
    >
      <div class="mt-1 text-apex-gold"><i class="fas fa-map-marker-alt"></i></div>
      <div class="flex-1">
        <h5 class="font-serif font-bold text-gray-800 text-base">${c.name}</h5>
        <p class="text-xs text-gray-500">${c.location}</p>
        <span class="inline-block mt-2 bg-apex-dark text-white text-[10px] px-2 py-0.5 rounded-full">Apex Partner</span>
      </div>
      ${state.clubId === c.id ? '<div class="absolute right-4 top-4 text-apex-gold"><i class="fas fa-check-circle"></i></div>' : ''}
    </div>
  `).join('');

  const timesHtml = teeTimes.map(t => `
    <button 
      onclick="selectTime('${t}')"
      class="px-4 py-2 rounded-full text-xs font-medium border transition ${state.time === t ? 'bg-apex-gold border-apex-gold text-white' : 'border-gray-200 text-gray-600 hover:border-apex-gold'}"
    >
      ${t}
    </button>
  `).join('');

  return `
    <div class="p-4 pb-32 fade-in">
      <div class="bg-white rounded-xl p-5 shadow-sm mb-4">
        <div class="flex items-start gap-3 mb-6">
          <div class="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center text-xl">🏌️</div>
          <div>
            <h3 class="font-serif text-lg text-gray-800">Select Your Club & Date</h3>
            <p class="text-xs text-gray-500">Choose where and when you'd like to play</p>
          </div>
        </div>

        <div class="mb-6">
          <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 text-center">Partner Clubs</h4>
          <div class="space-y-3">
            ${clubsHtml}
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl p-5 shadow-sm">
        <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 text-center">Date, Time & Players</h4>
        
        <div class="mb-4">
          <label class="block text-xs font-medium text-gray-700 mb-1">DATE OF ROUND</label>
          <input 
            type="date" 
            value="${state.date}"
            onchange="updateDate(this.value)"
            class="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:border-apex-gold"
          />
        </div>

        <div class="mb-4">
          <label class="block text-xs font-medium text-gray-700 mb-1">NUMBER OF PLAYERS</label>
          <div class="flex items-center border border-gray-200 rounded-lg w-32">
            <button onclick="updatePlayers(-1)" class="px-3 py-2 text-gray-500 hover:bg-gray-50">-</button>
            <input type="text" value="${state.players}" readonly class="w-full text-center text-gray-800 font-medium outline-none text-sm"/>
            <button onclick="updatePlayers(1)" class="px-3 py-2 text-gray-500 hover:bg-gray-50">+</button>
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-700 mb-2">PREFERRED TEE TIME</label>
          <div class="flex flex-wrap gap-2">
            ${timesHtml}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderStep2() {
  const caddiesHtml = caddies.map(c => `
    <div 
      onclick="selectCaddie(${c.id})"
      class="cursor-pointer bg-white rounded-xl p-4 shadow-sm border ${state.caddieId === c.id ? 'border-apex-gold ring-1 ring-apex-gold' : 'border-transparent'} flex items-center gap-4 transition"
    >
      <div class="w-12 h-12 rounded-full ${c.color} text-white flex items-center justify-center font-serif font-bold text-lg shrink-0">
        ${c.initials}
      </div>
      <div class="flex-1">
        <div class="flex justify-between items-start">
          <h4 class="font-serif font-bold text-gray-800">${c.name}</h4>
          <div class="flex items-center gap-1 text-apex-gold text-xs font-bold">
            <i class="fas fa-star"></i> ${c.rating}
          </div>
        </div>
        <p class="text-xs text-gray-500 mt-0.5">${c.specialty} · ${c.exp}</p>
        <div class="flex items-center gap-2 mt-2">
          ${c.topRated ? `<span class="bg-apex-gold/10 text-apex-gold text-[10px] px-2 py-0.5 rounded font-bold flex items-center gap-1"><i class="fas fa-star text-[8px]"></i> Top Rated</span>` : ''}
          <span class="bg-green-50 text-green-700 text-[10px] px-2 py-0.5 rounded font-bold flex items-center gap-1"><i class="fas fa-check text-[8px]"></i> Certified</span>
        </div>
      </div>
      <div class="text-right text-xs text-gray-400 font-medium">
        ${c.rounds} rounds
      </div>
    </div>
  `).join('');

  return `
    <div class="p-4 pb-32 fade-in">
      <div class="bg-white rounded-xl p-5 shadow-sm mb-4">
        <div class="flex items-start gap-3 mb-2">
          <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-xl">👕</div>
          <div>
            <h3 class="font-serif text-lg text-gray-800">Choose Your Caddie</h3>
            <p class="text-xs text-gray-500">All caddies are Apex Academy certified</p>
          </div>
        </div>
      </div>

      <div class="space-y-3">
        ${caddiesHtml}
      </div>
    </div>
  `;
}

function renderStep3() {
  const equipmentHtml = equipment.map(e => {
    const qty = state.selectedEquipment.find(item => item.id === e.id)?.qty || 0;
    return `
      <div class="flex items-center gap-4 border-b border-gray-50 last:border-0 pb-4 last:pb-0">
        <div class="text-2xl">🏌️</div>
        <div class="flex-1">
          <h5 class="font-serif font-bold text-gray-800 text-sm">${e.name}</h5>
          <p class="text-xs text-gray-500 leading-tight mt-1">${e.desc}</p>
          <span class="inline-block mt-1 bg-apex-gold/10 text-apex-gold text-[10px] px-1.5 rounded">${e.brand}</span>
        </div>
        <div class="text-right">
          <div class="font-serif font-bold text-gray-800">Ksh ${e.price.toLocaleString()}</div>
          <div class="text-[10px] text-gray-400 mb-1">per round</div>
          <div class="flex items-center border border-gray-200 rounded-lg h-8 w-24 bg-white">
            <button onclick="updateEquipmentQty(${e.id}, -1)" class="w-8 h-full flex items-center justify-center text-gray-500 hover:bg-gray-50">-</button>
            <input type="text" value="${qty}" readonly class="w-full text-center text-xs font-bold outline-none"/>
            <button onclick="updateEquipmentQty(${e.id}, 1)" class="w-8 h-full flex items-center justify-center text-gray-500 hover:bg-gray-50">+</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="p-4 pb-32 fade-in">
      <div class="bg-white rounded-xl p-5 shadow-sm mb-4">
        <div class="flex items-start gap-3 mb-2">
          <div class="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-xl">🏌️‍♂️</div>
          <div>
            <h3 class="font-serif text-lg text-gray-800">Equipment Hire</h3>
            <p class="text-xs text-gray-500">Premium gear delivered to the club or your hotel</p>
          </div>
        </div>
      </div>

      <div class="bg-apex-dark rounded-xl p-4 mb-4 text-white flex items-start gap-3 shadow-md">
        <div class="text-2xl">🚚</div>
        <div>
          <h4 class="font-serif text-apex-gold text-lg italic">No clubs? No problem.</h4>
          <p class="text-xs text-gray-300 mt-1 leading-relaxed">
            All equipment is sanitised, maintained, and delivered before your tee time.
          </p>
        </div>
      </div>

      <div class="bg-white rounded-xl p-5 shadow-sm mb-4">
        <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Full Club Sets</h4>
        <div class="space-y-4">
          ${equipmentHtml}
        </div>
      </div>

      <div class="bg-white rounded-xl p-5 shadow-sm mb-4">
        <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Enhance Your Round</h4>
        <div class="space-y-3">
          <label class="flex items-center justify-between p-3 border border-gray-100 rounded-lg cursor-pointer hover:bg-gray-50">
            <div class="flex items-center gap-3">
              <input type="checkbox" checked disabled class="w-4 h-4 text-apex-gold rounded"/>
              <div>
                <div class="font-medium text-sm">Apex Cool Box</div>
                <div class="text-xs text-gray-500">Included with every caddie</div>
              </div>
            </div>
            <span class="text-xs font-medium text-gray-400">Included</span>
          </label>
          <label class="flex items-center justify-between p-3 border border-gray-100 rounded-lg cursor-pointer hover:bg-gray-50">
            <div class="flex items-center gap-3">
              <input 
                type="checkbox" 
                ${state.addons.photo ? 'checked' : ''}
                onchange="toggleAddon('photo')"
                class="w-4 h-4 text-apex-gold rounded"
              />
              <div>
                <div class="font-medium text-sm">Golf Photography</div>
                <div class="text-xs text-gray-500">On-course photos & swing sequences</div>
              </div>
            </div>
            <span class="text-xs font-medium text-gray-800">Ksh 2,500</span>
          </label>
        </div>
      </div>

      <div class="bg-white rounded-xl p-5 shadow-sm">
        <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2"><i class="fas fa-box"></i> Equipment Delivery</h4>
        <div class="space-y-2">
          <button 
            onclick="setDelivery('club', 0)"
            class="w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition ${state.delivery.type === 'club' ? 'border-apex-gold bg-apex-gold/10 text-apex-dark' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}"
          >
            At the golf club (free)
          </button>
          <button 
            onclick="setDelivery('hotel', 500)"
            class="w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition ${state.delivery.type === 'hotel' ? 'border-apex-gold bg-apex-gold/10 text-apex-dark' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}"
          >
            Hotel delivery (+Ksh 500)
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderStep4() {
  return `
    <div class="p-4 pb-32 fade-in">
      <div class="bg-white rounded-xl p-5 shadow-sm mb-4">
        <div class="flex items-start gap-3 mb-2">
          <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-xl text-blue-600"><i class="fas fa-user"></i></div>
          <div>
            <h3 class="font-serif text-lg text-gray-800">Your Details</h3>
            <p class="text-xs text-gray-500">So we can confirm your booking</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl p-5 shadow-sm space-y-4">
        <div>
          <label class="block text-xs font-bold text-gray-500 uppercase mb-1">First Name</label>
          <input 
            type="text" 
            value="${state.firstName}"
            oninput="updateField('firstName', this.value)"
            placeholder="e.g. John"
            class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-apex-gold focus:ring-1 focus:ring-apex-gold"
          />
        </div>
        <div>
          <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Last Name</label>
          <input 
            type="text" 
            value="${state.lastName}"
            oninput="updateField('lastName', this.value)"
            placeholder="e.g. Smith"
            class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-apex-gold"
          />
        </div>
        <div>
          <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
          <input 
            type="email" 
            value="${state.email}"
            oninput="updateField('email', this.value)"
            placeholder="john@email.com"
            class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-apex-gold"
          />
        </div>
        <div>
          <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Phone / WhatsApp</label>
          <input 
            type="tel" 
            value="${state.phone}"
            oninput="updateField('phone', this.value)"
            placeholder="+254 700 000 000"
            class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-apex-gold"
          />
        </div>
        <div>
          <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Nationality</label>
          <select 
            value="${state.nationality}"
            onchange="updateField('nationality', this.value)"
            class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-apex-gold text-gray-600"
          >
            <option value="">Select country...</option>
            <option value="Kenyan">Kenyan</option>
            <option value="British">British</option>
            <option value="American">American</option>
            <option value="South African">South African</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Shoe Size (If hiring shoes)</label>
          <input 
            type="text" 
            value="${state.shoeSize}"
            oninput="updateField('shoeSize', this.value)"
            placeholder="e.g. UK 10, EU 44"
            class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-apex-gold"
          />
        </div>
        <div>
          <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Special Requests (Optional)</label>
          <textarea 
            value="${state.requests}"
            oninput="updateField('requests', this.value)"
            placeholder="e.g. Left-handed clubs, dietary notes"
            rows="2"
            class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-apex-gold"
          ></textarea>
        </div>
      </div>
    </div>
  `;
}

function renderStep5() {
  const equipmentTotal = state.selectedEquipment.reduce((acc, item) => {
    const eq = equipment.find(e => e.id === item.id);
    return acc + (eq ? eq.price * item.qty : 0);
  }, 0);

  return `
    <div class="p-4 pb-32 fade-in">
      <div class="bg-white rounded-xl p-5 shadow-sm mb-4">
        <div class="flex items-start gap-3 mb-2">
          <div class="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-xl text-green-600"><i class="fas fa-credit-card"></i></div>
          <div>
            <h3 class="font-serif text-lg text-gray-800">Payment</h3>
            <p class="text-xs text-gray-500">Secure payment — booking confirmed instantly</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl p-5 shadow-sm mb-4">
        <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Payment Method</h4>
        <div class="grid grid-cols-3 gap-3 mb-6">
          <button class="border-2 border-apex-gold bg-apex-gold/10 rounded-xl p-3 flex flex-col items-center gap-2">
            <i class="fas fa-mobile-alt text-2xl text-gray-800"></i>
            <span class="text-xs font-bold text-gray-800">M-Pesa</span>
          </button>
          <button class="border border-gray-200 rounded-xl p-3 flex flex-col items-center gap-2 opacity-60">
            <i class="fas fa-credit-card text-2xl text-gray-400"></i>
            <span class="text-xs font-bold text-gray-500">Card</span>
          </button>
          <button class="border border-gray-200 rounded-xl p-3 flex flex-col items-center gap-2 opacity-60">
            <i class="fas fa-university text-2xl text-gray-400"></i>
            <span class="text-xs font-bold text-gray-500">Bank</span>
          </button>
        </div>

        <div>
          <label class="block text-xs font-bold text-gray-500 uppercase mb-1">M-Pesa Number</label>
          <div class="relative">
            <span class="absolute left-4 top-3.5 text-gray-500 font-medium">+254</span>
            <input 
              type="tel" 
              value="${state.phone.replace('+254', '').trim()}"
              oninput="updatePhone(this.value)"
              class="w-full bg-gray-50 border border-gray-200 rounded-lg pl-14 pr-4 py-3 text-sm focus:outline-none focus:border-apex-gold"
              placeholder="700 000 000"
            />
          </div>
          <p class="text-xs text-gray-500 mt-2 leading-relaxed">
            You will receive an M-Pesa prompt on your phone. Enter your PIN to confirm.
          </p>
        </div>
      </div>

      <div class="bg-gray-100 rounded-xl p-5 space-y-2">
        <div class="flex justify-between text-sm">
          <span class="text-gray-600">Caddie service</span>
          <span class="font-medium text-gray-800">Ksh ${(3500 * state.players).toLocaleString()}</span>
        </div>
        ${equipmentTotal > 0 ? `
        <div class="flex justify-between text-sm">
          <span class="text-gray-600">Equipment</span>
          <span class="font-medium text-gray-800">Ksh ${equipmentTotal.toLocaleString()}</span>
        </div>
        ` : ''}
        <div class="flex justify-between text-sm">
          <span class="text-gray-600">Equipment delivery</span>
          <span class="font-medium text-gray-800">Ksh ${state.delivery.cost}</span>
        </div>
        ${state.addons.photo ? `
        <div class="flex justify-between text-sm">
          <span class="text-gray-600">Photography</span>
          <span class="font-medium text-gray-800">Ksh 2,500</span>
        </div>
        ` : ''}
        <div class="border-t border-gray-300 my-2 pt-2 flex justify-between items-center">
          <span class="font-bold text-gray-800">Total</span>
          <span class="font-bold text-xl text-gray-900">Ksh ${calculateTotal().toLocaleString()}</span>
        </div>
      </div>
    </div>
  `;
}

function renderFooter() {
  const clubName = state.clubId ? clubs.find(c => c.id === state.clubId)?.name : 'Not selected';
  const caddieName = state.caddieId ? caddies.find(c => c.id === state.caddieId)?.name : 'Not selected';
  
  let equipStr = 'None selected';
  if(state.selectedEquipment.length > 0) {
    equipStr = state.selectedEquipment.map(i => {
      const e = equipment.find(x => x.id === i.id);
      return `${i.qty > 1 ? i.qty+'x ' : ''}${e.brand} Set`;
    }).join(', ');
  }

  const btnText = state.step === 1 ? 'Continue — Choose Your Caddie' :
                  state.step === 2 ? 'Continue — Equipment Hire' :
                  state.step === 3 ? 'Continue — Your Details' :
                  state.step === 4 ? 'Continue — Payment' : 'Confirm & Pay';

  const isLastStep = state.step === 5;

  return `
    <div class="bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] p-4 z-50 shrink-0">
      <div class="flex justify-between items-center mb-3">
        <h3 class="font-serif text-apex-dark font-bold text-lg">Booking Summary</h3>
        <span class="text-apex-gold text-xs font-bold">ApexGolf Africa</span>
      </div>
      
      <div class="space-y-1 mb-4 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-400">Club</span>
          <span class="text-gray-800 font-medium">${clubName}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">Date</span>
          <span class="text-gray-800 font-medium">${state.date ? new Date(state.date).toLocaleDateString('en-GB', {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'}) : '-'}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">Tee Time</span>
          <span class="text-gray-800 font-medium">${state.time || '-'}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">Players</span>
          <span class="text-gray-800 font-medium">${state.players}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">Caddie</span>
          <span class="text-gray-800 font-medium">${caddieName}</span>
        </div>
      </div>

      <div class="bg-apex-gold/20 rounded-lg p-3 flex justify-between items-center mb-3">
        <div>
          <div class="text-xs text-gray-600 font-medium">TOTAL</div>
          <div class="text-[10px] text-gray-500">incl. all fees</div>
        </div>
        <div class="font-serif text-2xl font-bold text-gray-900">Ksh ${calculateTotal().toLocaleString()}</div>
      </div>

      ${!isLastStep ? `
      <button 
        onclick="nextStep()"
        ${!canProceed() ? 'disabled' : ''}
        class="w-full font-bold py-3.5 rounded-xl shadow-md transition flex justify-center items-center gap-2 ${canProceed() ? 'bg-apex-gold text-white hover:bg-yellow-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}"
      >
        <span>${btnText}</span>
        <span>→</span>
      </button>
      ` : `
      <button 
        onclick="handleSubmit()"
        class="w-full bg-apex-dark text-white font-bold py-3.5 rounded-xl shadow-md hover:bg-green-900 transition flex justify-center items-center gap-2"
      >
        <span>🔒</span>
        <span>${btnText}</span>
      </button>
      `}
      
      ${state.step > 1 ? `
      <button onclick="prevStep()" class="w-full mt-2 text-gray-500 text-xs font-medium py-2 hover:text-gray-800">
        ← Back
      </button>
      ` : ''}
    </div>
  `;
}

function renderSuccess() {
  root.innerHTML = `
    <div class="w-full min-h-screen bg-gray-50 flex flex-col">
      ${renderStatusBar()}
      ${renderHeader()}
      ${renderHero()}
      ${renderStepper()}
      
      <div class="flex-1 overflow-y-auto p-6 flex flex-col items-center text-center pt-16">
        <div class="w-24 h-24 bg-apex-dark rounded-full flex items-center justify-center mb-6 shadow-xl relative">
          <div class="absolute inset-0 bg-apex-gold rounded-full opacity-20 animate-ping"></div>
          <span class="text-3xl">⛳</span>
        </div>
        
        <h2 class="font-serif text-3xl text-gray-900 mb-2">You're Booked!</h2>
        <p class="text-gray-500 text-sm mb-6 max-w-[260px]">
          Your Apex experience is confirmed. We'll send full details to your email and WhatsApp shortly.
        </p>
        
        <div class="bg-apex-gold/20 px-8 py-3 rounded-lg mb-6">
          <span class="font-serif text-xl font-bold text-apex-dark tracking-widest">${state.bookingRef}</span>
        </div>

        <p class="text-xs text-gray-500 mb-8 max-w-[280px] leading-relaxed">
          Save this reference. Your caddie will greet you at the clubhouse entrance with your Cool Box and all hired equipment ready.
        </p>

        <button 
          onclick="reset()"
          class="w-full bg-apex-gold text-white font-bold py-4 rounded-xl shadow-lg hover:bg-yellow-600 transition"
        >
          Make Another Booking
        </button>
      </div>
    </div>
  `;
}

// Global functions for onclick handlers
window.selectClub = (id) => { state.clubId = id; render(); };
window.selectTime = (t) => { state.time = t; render(); };
window.updateDate = (d) => { state.date = d; render(); };
window.updatePlayers = (change) => { 
  state.players = Math.max(1, Math.min(4, state.players + change)); 
  render(); 
};
window.selectCaddie = (id) => { state.caddieId = id; render(); };
window.updateEquipmentQty = (id, change) => { updateEquipment(id, change); };
window.toggleAddon = (addon) => { 
  if(addon === 'photo') state.addons.photo = !state.addons.photo; 
  render(); 
};
window.setDelivery = (type, cost) => { state.delivery = { type, cost }; render(); };
window.updateField = (field, value) => { state[field] = value; };
window.updatePhone = (value) => { state.phone = '+254 ' + value; };
window.nextStep = nextStep;
window.prevStep = prevStep;
window.handleSubmit = handleSubmit;
window.reset = reset;

// Initial render
render();