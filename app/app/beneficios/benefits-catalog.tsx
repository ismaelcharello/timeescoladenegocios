"use client";

import { useMemo, useState } from "react";

type BenefitItem = {
  id: number;
  title: string;
  category: string;
  description: string;
  benefit: string;
  conditions: string;
  coverage: string;
  validUntil: string | null;
  ctaLabel: string;
  ctaUrl: string;
  status: "active" | "inactive" | "coming_soon";
};

function formatValidity(value: string | null) {
  if (!value) return "Não informada";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime()) ? "A confirmar" : new Intl.DateTimeFormat("pt-BR").format(date);
}

export default function BenefitsCatalog({ items }: { items: BenefitItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<BenefitItem | null>(null);
  const categories = useMemo(() => [...new Set(items.map((item) => item.category))], [items]);
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return items.filter((item) => (category === "all" || item.category === category) && (!normalized || [item.title, item.description, item.benefit, item.coverage].some((value) => value.toLocaleLowerCase("pt-BR").includes(normalized))));
  }, [category, items, query]);

  return <>
    <div className="benefits-catalog-tools" role="search" aria-label="Buscar benefícios">
      <label>Buscar<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busque por benefício, categoria ou abrangência" /></label>
      <label>Categoria<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Todas as categorias</option>{categories.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
    </div>
    {!visible.length ? <p className="benefits-empty">Nenhum benefício encontrado com esses filtros.</p> : <div className="simple-member-grid">
      {visible.map((item) => <article key={item.id}>
        <div><span>{item.category}</span>{item.status === "coming_soon" ? <b>EM BREVE</b> : <b>ATIVO</b>}</div>
        <h2>{item.title}</h2><p>{item.description}</p>
        <dl><div><dt>Benefício</dt><dd>{item.benefit}</dd></div><div><dt>Condições</dt><dd>{item.conditions}</dd></div><div><dt>Abrangência</dt><dd>{item.coverage || "Não informada"}</dd></div>{item.validUntil ? <div><dt>Validade</dt><dd>{formatValidity(item.validUntil)}</dd></div> : null}</dl>
        <button type="button" disabled={item.status === "coming_soon"} onClick={() => setSelected(item)}>{item.status === "coming_soon" ? "Em breve" : "Ver condições"}</button>
      </article>)}
    </div>}
    {selected ? <div className="benefit-detail-modal" role="dialog" aria-modal="true" aria-labelledby="benefit-detail-title">
      <button className="benefit-detail-backdrop" aria-label="Fechar detalhe" onClick={() => setSelected(null)} />
      <section><header><div><span>{selected.category}</span><h2 id="benefit-detail-title">{selected.title}</h2></div><button aria-label="Fechar detalhe" onClick={() => setSelected(null)}>×</button></header><p>{selected.description}</p><dl><div><dt>Benefício</dt><dd>{selected.benefit}</dd></div><div><dt>Condições</dt><dd>{selected.conditions}</dd></div><div><dt>Abrangência</dt><dd>{selected.coverage || "Não informada"}</dd></div><div><dt>Validade</dt><dd>{formatValidity(selected.validUntil)}</dd></div></dl>{selected.ctaUrl ? <a href={selected.ctaUrl} target="_blank" rel="noreferrer">{selected.ctaLabel}</a> : <small>Consulte a equipe TIME para utilizar este benefício.</small>}</section>
    </div> : null}
  </>;
}
