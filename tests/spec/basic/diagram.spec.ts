import { Diagram } from "@db-diagram/elements/diagram";
import { loadAttributeFrom, loadAttributeFixture } from "@db-diagram/tests/helpers/helper";
import { Fixture, loadFixtures } from "@db-diagram/tests/helpers/karma";
import { TableOptions } from "@db-diagram/elements/utils/options";
import { Table } from "@db-diagram/elements/table";
import { onDomReady } from "@db-diagram/shares/elements";

let htmlFixture: Fixture<HTMLElement>;

// wait for dom to finish before starting test
beforeAll((done) => {
   onDomReady(done);
});

describe("Diagram", () => {

   beforeEach(() => {
      htmlFixture = loadFixtures("container.html");
   });

   afterEach(() => {
      if (htmlFixture.reset) htmlFixture.reset();
   });

   it("create", () => {
      let diagram = new Diagram();
      diagram.attach(document.body);
      expect(diagram).toBeTruthy();
      expect(diagram.native).toBeTruthy();
      expect(diagram.native.tagName).toBe("svg");
      expect(diagram.native.childElementCount).toEqual(1);
      expect(diagram.holder).toBeTruthy();
      expect(diagram.holder.tagName).toBe("g");
      expect(diagram.holder).toEqual(diagram.native.children[0] as SVGGElement);
      expect(diagram.native.children[0].childElementCount).toEqual(0);
      expect(diagram.native.parentElement).toBe(document.body);
      expect(htmlFixture.data.childElementCount).toEqual(0);
      diagram.detach();
   });

   it("create with id", () => {
      let id = htmlFixture.data.getAttribute("id")!;
      let diagram = new Diagram({ id: id });
      diagram.attach(`#${id}`);
      expect(diagram).toBeTruthy();
      expect(diagram.native).toBeTruthy();
      expect(diagram.native.tagName).toBe("svg");
      expect(diagram.native.childElementCount).toEqual(1);
      expect(diagram.holder).toBeTruthy();
      expect(diagram.holder.tagName).toBe("g");
      expect(diagram.holder).toEqual(diagram.native.children[0] as SVGGElement);
      expect(diagram.native.children[0].childElementCount).toEqual(0);
      expect(htmlFixture.data.childElementCount).toEqual(1);
      expect(htmlFixture.data.children[0] instanceof SVGSVGElement).toBeTruthy();
      expect(diagram.native).toBe(htmlFixture.data.children[0] as SVGSVGElement);
      diagram.detach();
   });

   it("attach", () => {
      let diagram1 = new Diagram();
      diagram1.attach(`#${htmlFixture.data.getAttribute("id")!}`);
      expect(htmlFixture.data.childElementCount).toBe(1);
      expect(htmlFixture.data.children[0].tagName).toBe('svg');
      expect(htmlFixture.data.children[0]).toBe(diagram1.native);
      diagram1.detach();

      let diagram2 = new Diagram();
      diagram2.attach(htmlFixture.data.getAttribute("id")!);
      expect(htmlFixture.data.childElementCount).toBe(1);
      expect(htmlFixture.data.children[0].tagName).toBe('svg');
      expect(htmlFixture.data.children[0]).toBe(diagram2.native);
      diagram2.detach();
   });

   it("verify attribute", () => {
      let opt = loadAttributeFixture("svg.attr.json");
      let diagram = new Diagram(opt);
      diagram.attach(htmlFixture.data);
      let attrs = loadAttributeFrom(diagram.native);
      // remove function toString as we only care about properties
      delete opt.viewBox.toString;
      delete attrs.viewBox!.toString;
      expect(attrs).toEqual(opt);
      diagram.detach();
   });

   it("create table", () => {
      let opt = loadAttributeFixture("svg.attr.json");
      let diagram = new Diagram(opt);
      diagram.attach(htmlFixture.data);

      let verify = (table: Table, opt: TableOptions, childCount: number, index: number) => {
         expect(table).toBeTruthy();
         expect(table.native).toBeTruthy();
         expect(table.native).toBeTruthy();
         expect(diagram.holder.childElementCount).toEqual(childCount);
         expect(diagram.holder.children[index] instanceof SVGGElement).toBeTruthy();
         expect(table.native).toBe(diagram.holder.children[index] as SVGGElement);
   
         expect(diagram.table(opt)).toBeTruthy();
         expect(diagram.indexOf(table)).toEqual(index);
      }

      let tbOpt1: TableOptions = { name: "Table1" };
      let tb1 = diagram.table(tbOpt1);
      verify(tb1!, tbOpt1, 1, 0);

      let tbOpt2: TableOptions = { name: "Table2" };
      let tb2 = diagram.table(tbOpt2);
      verify(tb2!, tbOpt2, 2, 1);

      let tbOpt3: TableOptions = { name: "Table3" };
      let tb3 = diagram.table(tbOpt3);
      verify(tb3!, tbOpt3, 3, 2);

      expect(diagram.allTables()).toBeTruthy();
      expect(diagram.tableCount).toEqual(3);

      let tb1RM = diagram.table(tbOpt1, true);
      expect(tb1RM).toEqual(tb1);
      expect(diagram.indexOf(tb1!)).toEqual(-1);
      expect(diagram.tableCount).toEqual(2);
      expect(diagram.holder.childElementCount).toEqual(2);
      expect(tb1!.native.parentElement).toBeNull();
      diagram.detach();
   });

});