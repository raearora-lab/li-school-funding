import pandas as pd, numpy as np, json, warnings
warnings.filterwarnings('ignore')
base=pd.read_csv('li_districts.csv',dtype={'beds':str})
m=pd.read_csv('/tmp/match.csv',dtype={'muni':str,'beds':str})
base=base.merge(m[['beds','muni','osc_name']],on='beds')
d=pd.read_csv('osc/2025_SchoolDistrict.csv',dtype={'MUNICIPAL_CODE':str})
d=d[d.MUNICIPAL_CODE.isin(base.muni)].copy()
d['fund']=d.ACCOUNT_CODE.str[0]; d['code']=d.ACCOUNT_CODE.str[1:].str.lstrip('CM')
r=d[(d.ACCOUNT_CODE_SECTION=='REVENUE')&d.fund.isin(list('ACFHV'))&~d.LEVEL_1_CATEGORY.isin(['Other Sources','Proceeds of Debt'])].copy()
def cat(row):
    l1,c=row.LEVEL_1_CATEGORY,row.code
    if l1=='Real Property Taxes and Assessments': return 'property_tax'
    if c=='1085': return 'star'
    if c in ('1080','1081'): return 'pilots'
    if l1=='State Aid':
        return 'state_formula' if (row.fund=='A' and c in ('3101','3102','3103')) else 'state_other'
    if l1=='Federal Aid': return 'federal_aid'
    if l1 in ('Charges for Services','Charges to Other Governments'): return 'tuition_charges'
    if l1=='Use and Sale of Property' and c=='2401': return 'interest_earnings'
    return 'other_local'
r=r[~r.code.isin(['2801','2710'])].copy()
r['cat']=r.apply(cat,axis=1)
p=r.pivot_table(index='MUNICIPAL_CODE',columns='cat',values='AMOUNT',aggfunc='sum').fillna(0)
cats=['property_tax','star','pilots','state_formula','state_other','federal_aid','tuition_charges','interest_earnings','other_local']
for c in cats:
    if c not in p: p[c]=0
p['state_aid_total']=p.state_formula+p.state_other
p['total_revenue']=p[cats].sum(axis=1)
# general fund balance
fb=d[(d.fund=='A')&d.code.isin(['8021','8029','8012','8015'])].pivot_table(index='MUNICIPAL_CODE',columns='code',values='AMOUNT',aggfunc='sum')
p['gf_fund_balance_begin']=fb['8021']; p['gf_fund_balance_end']=fb['8029']
fb=fb.fillna(0)
p['gf_prior_period_adj']=fb['8012']-fb['8015']
p['gf_fund_balance_change']=fb['8029']-fb['8021']-p['gf_prior_period_adj']
# check for prior period adjustments etc
print(d[(d.ACCOUNT_CODE_SECTION=='FBNP')&(d.fund=='A')].groupby(['code','ACCOUNT_CODE_NARRATIVE']).size())
out=base[['beds','district','county','enroll_k12','enroll_k12_prev','enroll_pk12','nces_leaid','office_lat','office_lon','muni','osc_name']].merge(p.reset_index().rename(columns={'MUNICIPAL_CODE':'muni'}),on='muni',how='left')
# PTRC appropriated fund balance 2026-27
pt=pd.read_excel('2026-27-ptrc-final.xlsx',dtype={'BEDS Code':str})
pt.columns=[str(c).strip() for c in pt.columns]
pt['b6']=pt['BEDS Code'].str.zfill(6)
pt=pt[['b6','Assigned Approp FB 2026-27','Tax Cap Reserve Used for 2026-27']].rename(columns={'b6':'beds','Assigned Approp FB 2026-27':'approp_fund_balance_2026_27','Tax Cap Reserve Used for 2026-27':'tax_cap_reserve_used_2026_27'})
out=out.merge(pt,on='beds',how='left')
# NYSED enacted runs 2026-27
def runs(sheet):
    x=pd.read_excel('aid/dbsaa1.xlsx',sheet_name=sheet,header=0,dtype={sheet:str})
    return x
a=runs('DBSAA1'); b=runs('DBSAB1')
a=a.rename(columns={a.columns[0]:'code'}); b=b.rename(columns={b.columns[0]:'code'})
fa26=[c for c in a.columns if '2026-27 FOUNDATION AID' in c][0]; ta26=[c for c in a.columns if '2026-27 TOTAL AID' in c][0]
print([c for c in b.columns][:40])
a2=a[['code',fa26,ta26]].rename(columns={fa26:'foundation_aid_2026_27',ta26:'total_formula_aid_2026_27'})
fa25=[c for c in b.columns if '2025-26 FOUNDATION AID' in c]; ta25=[c for c in b.columns if '2025-26 TOTAL AID' in c]
print(fa25,ta25)
if fa25 and ta25:
    a2=a2.merge(b[['code',fa25[0],ta25[0]]].rename(columns={fa25[0]:'foundation_aid_2025_26',ta25[0]:'total_formula_aid_2025_26'}),on='code',how='left')
a2['code']=a2.code.astype(str).str.zfill(6)
out=out.merge(a2.rename(columns={'code':'beds'}),on='beds',how='left')
print(out.isna().sum()[out.isna().sum()>0])
out.to_pickle('/tmp/funding.pkl')
