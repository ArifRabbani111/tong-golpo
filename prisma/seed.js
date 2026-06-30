const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const events = [
    // Today, June 30 — Round of 32
    {
      title: "Ivory Coast vs Norway",
      subtitle: "Round of 32 · 1:00 PM ET · AT&T Stadium, Arlington",
      status: "ended",
    },
    {
      title: "France vs Sweden",
      subtitle: "Round of 32 · 5:00 PM ET · MetLife Stadium, NJ",
      status: "live",
    },
    {
      title: "Mexico vs Ecuador",
      subtitle: "Round of 32 · 9:00 PM ET · Estadio Azteca, Mexico City",
      status: "upcoming",
    },
    // Recent results
    {
      title: "England vs Panama",
      subtitle: "Group stage · Final: England 2-0 Panama",
      status: "ended",
    },
    {
      title: "Canada vs South Africa",
      subtitle: "Round of 32 · Los Angeles Stadium",
      status: "ended",
    },
    {
      title: "Brazil vs Japan",
      subtitle: "Round of 32 · Houston Stadium",
      status: "ended",
    },
  ];

  for (const e of events) {
    await prisma.event.create({ data: e });
  }
  console.log("Seeded events.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
