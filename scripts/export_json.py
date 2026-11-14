import pandas as pd, json, math
x=pd.read_csv('/workspace/li-schools/li_funding.csv',dtype={'beds':str,'nces_leaid':str})
cols=['property_tax','star','pilots','state_formula','state_other','state_aid_total','federal_aid','tuition_charges','interest_earnings','other_local','total_revenue','gf_fund_balance_change','approp_fund_balance_2026_27','foundation_aid_2026_27','foundation_aid_2025_26','total_formula_aid_2026_27']
def v(a):
    return None if (a is None or (isinstance(a,float) and math.isnan(a))) else round(float(a))
rows=[]
for _,r in x.iterrows():
    o={'id':r.beds,'nces':str(r.nces_leaid),'name':r.district,'county':r.county,'enr':(None if pd.isna(r.enroll_k12_2024_25) else int(r.enroll_k12_2024_25)),'lat':r.office_lat,'lon':r.office_lon}
    for c in cols: o[c]=v(r[c])
    rows.append(o)
json.dump({'fiscal_year':'2024-25','rows':rows},open('public/data/funding.json','w'),separators=(',',':'))
print(len(rows))
