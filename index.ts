import { testErrorHotel } from "./service/hotel";
import { fileLocationList, showResult, writeFileConfig } from "./util/helpers";
import { crawlHotelLocation } from "./service/location";
import { crawHotelPage } from "./service/page";

async function main() {
  let locations = await fileLocationList();
  if (!locations?.length) {
    locations = await crawlHotelLocation();
  }

  await crawHotelPage(locations[0]);

  await writeFileConfig({
    currentPage: "0",
    pageLength: "0",
    url: locations[1],
    pageOffset: "0",
  });

  showResult();
}

main();
