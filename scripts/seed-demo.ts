import { config } from "dotenv";
config({ path: ".env.local" });

// Locally-hosted photos in public/images/ — see public/images/orgs and /food.
const IMG = {
  bakery: "/images/food/bakery.jpg",
  produce: "/images/food/produce.jpg",
  catering: "/images/food/catering.jpg",
  dairy: "/images/food/dairy.jpg",
  tray: "/images/food/sandwich.jpg",
  pasta: "/images/food/pasta.jpg",
  fruit: "/images/food/fruit.jpg",
  grain: "/images/food/grain.jpg",
};

const ORG_PHOTO = {
  bakery: "/images/orgs/golden-gate-bakery.jpg",
  grocer: "/images/orgs/marina-fresh-grocers.jpg",
  caterer: "/images/orgs/bella-vista-catering.jpg",
  taqueria: "/images/orgs/mission-taqueria.jpg",
  hope: "/images/orgs/hope-family-shelter.jpg",
  kitchen: "/images/orgs/community-kitchen-trust.jpg",
  pantry: "/images/orgs/st-anthonys-food-pantry.jpg",
  youth: "/images/orgs/youth-care-foundation.jpg",
};

const DEMO_EMAIL_DOMAIN = "@demo.rescueplate.local";
const DEMO_PASSWORD = "Demo1234!";
const DEMO_ORG_NAMES = [
  "Golden Gate Bakery",
  "Marina Fresh Grocers",
  "Bella Vista Catering",
  "Mission Taqueria Co.",
  "Hope Family Shelter",
  "Community Kitchen Trust",
  "St. Anthony's Food Pantry",
  "Youth Care Foundation",
];

// Most recent N Fridays at a given local hour, oldest first.
function lastFridaysAt(hour: number, count: number): Date[] {
  const out: Date[] = [];
  const d = new Date();
  d.setHours(hour, 30, 0, 0);
  while (d.getDay() !== 5) d.setDate(d.getDate() - 1);
  for (let i = 0; i < count; i++) {
    out.unshift(new Date(d));
    d.setDate(d.getDate() - 7);
  }
  return out;
}

function hoursFromNow(h: number): Date {
  return new Date(Date.now() + h * 60 * 60 * 1000);
}

async function main() {
  const { db, pool } = await import("../db");
  const { organizations, users, listings, claims, ratings } = await import("../db/schema");
  const bcrypt = (await import("bcryptjs")).default;
  const { inArray, like } = await import("drizzle-orm");
  const { rankCandidates } = await import("../engine/ranking");
  const { advanceQueue } = await import("../engine/claimWindow");

  console.log("Clearing any previous demo run (idempotent re-seed)...");
  await db.delete(users).where(like(users.email, `%${DEMO_EMAIL_DOMAIN}`));
  await db.delete(organizations).where(inArray(organizations.name, DEMO_ORG_NAMES));

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  console.log("Creating donor organizations...");
  const [bakery, grocer, caterer, taqueria] = await Promise.all([
    db
      .insert(organizations)
      .values({
        name: "Golden Gate Bakery",
        type: "donor_business",
        address: "412 Columbus Ave, San Francisco, CA",
        lat: 37.7985,
        lng: -122.4076,
        verificationStatus: "verified",
        photoUrl: ORG_PHOTO.bakery,
        about:
          "A neighborhood bakery in North Beach baking fresh sourdough and pastries daily. We hate throwing away good bread — RescuePlate helps us get end-of-day surplus to people who'll actually eat it.",
      })
      .returning(),
    db
      .insert(organizations)
      .values({
        name: "Marina Fresh Grocers",
        type: "donor_business",
        address: "2246 Chestnut St, San Francisco, CA",
        lat: 37.8005,
        lng: -122.4382,
        verificationStatus: "verified",
        photoUrl: ORG_PHOTO.grocer,
        about:
          "A family-run grocery store serving the Marina district since 2010. We donate produce and dairy nearing its sell-by date instead of sending it to landfill.",
      })
      .returning(),
    db
      .insert(organizations)
      .values({
        name: "Bella Vista Catering",
        type: "donor_business",
        address: "1200 9th Ave, San Francisco, CA",
        lat: 37.7649,
        lng: -122.4661,
        verificationStatus: "verified",
        photoUrl: ORG_PHOTO.caterer,
        about:
          "Full-service event catering for corporate and private functions across San Francisco. Leftover trays from every event go straight to RescuePlate's network.",
      })
      .returning(),
    db
      .insert(organizations)
      .values({
        name: "Mission Taqueria Co.",
        type: "donor_business",
        address: "2800 Mission St, San Francisco, CA",
        lat: 37.7539,
        lng: -122.4188,
        verificationStatus: "verified",
        photoUrl: ORG_PHOTO.taqueria,
        about:
          "A family taqueria in the Mission serving tacos, burritos, and daily specials. Surplus prep and unsold trays are shared with local shelters every evening.",
      })
      .returning(),
  ]);

  console.log("Creating receiver organizations...");
  const [hope, kitchen, pantry, youth] = await Promise.all([
    db
      .insert(organizations)
      .values({
        name: "Hope Family Shelter",
        type: "receiver_ngo",
        address: "90 7th St, San Francisco, CA",
        lat: 37.7768,
        lng: -122.4144,
        verificationStatus: "verified",
        capacityKg: 30,
        photoUrl: ORG_PHOTO.hope,
        about:
          "Emergency shelter and transitional housing for families experiencing homelessness in San Francisco. We serve three meals a day and rely on donated food to stretch our budget.",
      })
      .returning(),
    db
      .insert(organizations)
      .values({
        name: "Community Kitchen Trust",
        type: "receiver_ngo",
        address: "1950 Union St, San Francisco, CA",
        lat: 37.7975,
        lng: -122.4329,
        verificationStatus: "verified",
        capacityKg: 150,
        photoUrl: ORG_PHOTO.kitchen,
        about:
          "A community kitchen and meal program feeding unhoused and low-income residents. Our large-capacity kitchen can take on bigger donations other shelters can't store.",
      })
      .returning(),
    db
      .insert(organizations)
      .values({
        name: "St. Anthony's Food Pantry",
        type: "receiver_ngo",
        address: "150 Golden Gate Ave, San Francisco, CA",
        lat: 37.7825,
        lng: -122.4173,
        verificationStatus: "verified",
        capacityKg: 60,
        photoUrl: ORG_PHOTO.pantry,
        about: "A walk-in food pantry providing free groceries to low-income families across the city, no questions asked.",
      })
      .returning(),
    db
      .insert(organizations)
      .values({
        name: "Youth Care Foundation",
        type: "receiver_ngo",
        address: "4200 Judah St, San Francisco, CA",
        lat: 37.7599,
        lng: -122.5081,
        verificationStatus: "verified",
        capacityKg: 20,
        noShowCount: 3,
        flagged: true,
        photoUrl: ORG_PHOTO.youth,
        about:
          "Support services and after-school meal programs for at-risk youth. Every donated meal goes directly to a kid who needs it.",
      })
      .returning(),
  ]);

  const donorOrgs = [bakery[0], grocer[0], caterer[0], taqueria[0]];
  const receiverOrgs = [hope[0], kitchen[0], pantry[0], youth[0]];

  console.log("Creating demo users (all password: " + DEMO_PASSWORD + ")...");
  const donorUserNames = ["Maria Chen", "Sam Okafor", "Priya Nair", "Diego Ramirez"];
  const receiverUserNames = ["Jordan Blake", "Alex Kim", "Taylor Brooks", "Morgan Lee"];

  await Promise.all(
    donorOrgs.map((org, i) =>
      db
        .insert(users)
        .values({
          email: `donor${i + 1}${DEMO_EMAIL_DOMAIN}`,
          passwordHash,
          name: donorUserNames[i],
          role: "donor",
          orgId: org.id,
          bio: `${donorUserNames[i].split(" ")[0]} runs day-to-day operations at ${org.name}.`,
        })
        .returning()
    )
  );
  const receiverUsers = await Promise.all(
    receiverOrgs.map((org, i) =>
      db
        .insert(users)
        .values({
          email: `receiver${i + 1}${DEMO_EMAIL_DOMAIN}`,
          passwordHash,
          name: receiverUserNames[i],
          role: "receiver",
          orgId: org.id,
          bio: `${receiverUserNames[i].split(" ")[0]} coordinates food intake for ${org.name}.`,
        })
        .returning()
    )
  );
  await db.insert(users).values({
    email: `volunteer1${DEMO_EMAIL_DOMAIN}`,
    passwordHash,
    name: "Casey Nguyen",
    role: "volunteer",
    orgId: null,
    bio: "Weekend pickup and delivery volunteer covering the northeast side of the city.",
  });

  console.log("Creating historical listings (bakery, Friday pattern)...");
  const fridays = lastFridaysAt(18, 5);
  const bakeryStatuses = ["picked_up", "picked_up", "picked_up", "expired", "cancelled"] as const;
  for (let i = 0; i < fridays.length; i++) {
    const createdAt = fridays[i];
    const [listing] = await db
      .insert(listings)
      .values({
        donorOrgId: donorOrgs[0].id,
        title: "End-of-day bread & pastries",
        description:
          "Assorted sourdough loaves, croissants, and pastries left over from today's baking — still fresh, just unsold.",
        foodType: "Bakery",
        quantity: 12,
        unit: "kg",
        allergens: ["gluten", "dairy"],
        pickupWindowStart: new Date(createdAt.getTime() + 60 * 60 * 1000),
        pickupWindowEnd: new Date(createdAt.getTime() + 3 * 60 * 60 * 1000),
        claimExpiresAt: new Date(createdAt.getTime() + 2 * 60 * 60 * 1000),
        status: bakeryStatuses[i],
        lat: donorOrgs[0].lat,
        lng: donorOrgs[0].lng,
        urgencyHint: 0.4,
        imageUrl: IMG.bakery,
        createdAt,
      })
      .returning();

    if (bakeryStatuses[i] === "picked_up") {
      const receiver = receiverOrgs[i % 2];
      const [claim] = await db
        .insert(claims)
        .values({
          listingId: listing.id,
          receiverOrgId: receiver.id,
          claimedByUserId: receiverUsers[i % 2][0].id,
          status: "picked_up",
          rank: 1,
          score: 0.82,
          scoreBreakdown: { distance: 0.9, urgency: 0.4, fairness: 1, capacity: 0.6 },
          claimedAt: new Date(createdAt.getTime() + 30 * 60 * 1000),
          pickedUpAt: new Date(createdAt.getTime() + 90 * 60 * 1000),
        })
        .returning();

      await db.insert(ratings).values({
        claimId: claim.id,
        raterUserId: receiverUsers[i % 2][0].id,
        rateeOrgId: donorOrgs[0].id,
        score: 5,
        comment: "Great quality, right on time!",
      });
    }
  }

  console.log("Creating live listings and running the real allocation engine...");

  async function createAndAllocate(input: {
    donorOrg: (typeof donorOrgs)[number];
    title: string;
    description: string;
    foodType: string;
    quantity: number;
    unit: string;
    allergens: string[];
    safetyNotes?: string;
    urgencyHint: number;
    claimExpiresInHours: number;
    imageUrl: string;
  }) {
    const now = new Date();
    const [listing] = await db
      .insert(listings)
      .values({
        donorOrgId: input.donorOrg.id,
        title: input.title,
        description: input.description,
        foodType: input.foodType,
        quantity: input.quantity,
        unit: input.unit,
        allergens: input.allergens,
        safetyNotes: input.safetyNotes ?? null,
        pickupWindowStart: hoursFromNow(1),
        pickupWindowEnd: hoursFromNow(6),
        claimExpiresAt: hoursFromNow(input.claimExpiresInHours),
        status: "available",
        lat: input.donorOrg.lat,
        lng: input.donorOrg.lng,
        urgencyHint: input.urgencyHint,
        imageUrl: input.imageUrl,
        createdAt: now,
      })
      .returning();

    const ranked = await rankCandidates(listing.id);
    if (ranked.length > 0) {
      await db.transaction(async (tx) => {
        await tx.insert(claims).values(
          ranked.map((c) => ({
            listingId: listing.id,
            receiverOrgId: c.receiverOrgId,
            status: "pending" as const,
            rank: c.rank,
            score: c.score,
            scoreBreakdown: c.breakdown,
          }))
        );
        await advanceQueue(tx, listing.id);
      });
    }
    return listing;
  }

  await createAndAllocate({
    donorOrg: donorOrgs[1],
    title: "Fresh produce boxes — mixed vegetables",
    description: "12 boxes of mixed vegetables (peppers, greens, carrots) pulled from today's display, still good.",
    foodType: "Produce",
    quantity: 25,
    unit: "kg",
    allergens: [],
    urgencyHint: 0.35,
    claimExpiresInHours: 6,
    imageUrl: IMG.produce,
  });

  await createAndAllocate({
    donorOrg: donorOrgs[2],
    title: "Leftover catering trays — corporate event",
    description:
      "Bunch of leftover catering trays from a corporate event tonight, some dairy-based dishes included. Needs to go tonight.",
    foodType: "Prepared meals",
    quantity: 15,
    unit: "kg",
    allergens: ["dairy", "nuts"],
    safetyNotes: "Keep refrigerated until pickup; contains dairy-based sauces.",
    urgencyHint: 0.9,
    claimExpiresInHours: 2,
    imageUrl: IMG.catering,
  });

  await createAndAllocate({
    donorOrg: donorOrgs[3],
    title: "Bulk rice & grain surplus",
    description: "Large surplus of rice and dried grains from inventory overstock — dry goods, no rush on spoilage.",
    foodType: "Dry goods",
    quantity: 80,
    unit: "kg",
    allergens: [],
    urgencyHint: 0.2,
    claimExpiresInHours: 24,
    imageUrl: IMG.grain,
  });

  console.log("Creating a couple of closed-out listings (expired / no-show / cancelled)...");

  await db.insert(listings).values({
    donorOrgId: donorOrgs[1].id,
    title: "Dairy products nearing best-by date",
    description: "Yogurt and milk cartons nearing best-by date, still within safe window.",
    foodType: "Dairy",
    quantity: 10,
    unit: "kg",
    allergens: ["dairy"],
    pickupWindowStart: hoursFromNow(-20),
    pickupWindowEnd: hoursFromNow(-18),
    claimExpiresAt: hoursFromNow(-19),
    status: "expired",
    lat: donorOrgs[1].lat,
    lng: donorOrgs[1].lng,
    urgencyHint: 0.6,
    imageUrl: IMG.dairy,
    createdAt: hoursFromNow(-24),
  });

  const [noShowListing] = await db
    .insert(listings)
    .values({
      donorOrgId: donorOrgs[3].id,
      title: "Taco bar leftovers — sandwiches & wraps",
      description: "Assorted sandwiches and wraps from a cancelled office order.",
      foodType: "Prepared meals",
      quantity: 8,
      unit: "kg",
      allergens: ["gluten"],
      pickupWindowStart: hoursFromNow(-14),
      pickupWindowEnd: hoursFromNow(-12),
      claimExpiresAt: hoursFromNow(-13),
      status: "expired",
      lat: donorOrgs[3].lat,
      lng: donorOrgs[3].lng,
      urgencyHint: 0.5,
      imageUrl: IMG.tray,
      createdAt: hoursFromNow(-16),
    })
    .returning();

  await db.insert(claims).values({
    listingId: noShowListing.id,
    receiverOrgId: receiverOrgs[3].id,
    claimedByUserId: receiverUsers[3][0].id,
    status: "no_show",
    rank: 1,
    score: 0.71,
    scoreBreakdown: { distance: 0.7, urgency: 0.5, fairness: 0.8, capacity: 0.9 },
    claimedAt: hoursFromNow(-15),
  });

  await db.insert(listings).values({
    donorOrgId: donorOrgs[3].id,
    title: "Pasta dish surplus — cancelled catering order",
    description: "Prepared pasta dishes from a cancelled catering order, listed then withdrawn.",
    foodType: "Prepared meals",
    quantity: 6,
    unit: "kg",
    allergens: ["gluten", "dairy"],
    pickupWindowStart: hoursFromNow(-10),
    pickupWindowEnd: hoursFromNow(-8),
    claimExpiresAt: hoursFromNow(-9),
    status: "cancelled",
    lat: donorOrgs[3].lat,
    lng: donorOrgs[3].lng,
    urgencyHint: 0.3,
    imageUrl: IMG.pasta,
    createdAt: hoursFromNow(-11),
  });

  console.log("\nDone. Demo login credentials (password for all: " + DEMO_PASSWORD + "):");
  donorOrgs.forEach((org, i) => console.log(`  donor${i + 1}${DEMO_EMAIL_DOMAIN}  -> ${org.name}`));
  receiverOrgs.forEach((org, i) =>
    console.log(`  receiver${i + 1}${DEMO_EMAIL_DOMAIN} -> ${org.name}${org.flagged ? " (flagged)" : ""}`)
  );
  console.log(`  volunteer1${DEMO_EMAIL_DOMAIN} -> Casey Nguyen (volunteer, no org)`);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
