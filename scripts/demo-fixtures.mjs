// Synthetic examples for recording the real plugin UI without personal data.
export const demos = [
 {id:'demo-moon',title:'Moonbase launch room',prompt:'Plan a fictional lunar greenhouse launch. Track readiness, assign the launch checklist, and compare power budgets.',panels:[
 ['Metric',{title:'Launch readiness',value:'87%',detail:'Simulation · 3 systems awaiting sign-off'}],
 ['BarChart',{title:'Power budget · kW',items:[{label:'Grow lights',value:42},{label:'Life support',value:28},{label:'Comms',value:12}]}],
 ['Checklist',{title:'Pre-flight checks',field:'checks',items:[{id:'seeds',label:'Seal the seed vault'},{id:'water',label:'Test water recycling'},{id:'robot',label:'Wake the gardening robot'}]}],
 ['Select',{title:'Landing zone',field:'zone',options:['Shackleton rim','Peary crater','Malapert massif']}],
 ['Input',{title:'Flight director notes',field:'notes',placeholder:'What needs attention?'}],
 ['Text',{title:'Mission brief',body:'Grow the first salad beyond Earth.\nFictional planning data for a UI demonstration.'}]]},
 {id:'demo-noodles',title:'Midnight noodle lab',prompt:'Design a late-night ramen pop-up. Compare three recipes, track prep, and collect tasting notes.',panels:[
 ['Metric',{title:'Tonight’s target',value:'120 bowls',detail:'Fictional pop-up · doors at 22:00'}],
 ['Table',{title:'Recipe shootout',columns:['Bowl','Heat','Prep'],rows:[['Miso comet','Mild','18 min'],['Chili orbit','Hot','12 min'],['Mushroom moon','None','15 min']]}],
 ['Checklist',{title:'Before doors open',field:'prep',items:[{id:'broth',label:'Taste the broth'},{id:'noodles',label:'Portion the noodles'},{id:'playlist',label:'Queue the midnight playlist'}]}],
 ['Select',{title:'Tonight’s special',field:'special',options:['Miso comet','Chili orbit','Mushroom moon']}],
 ['Input',{title:'Tasting notes',field:'notes',multiline:true,placeholder:'Texture, aroma, the final twist…'}],
 ['BarChart',{title:'Test-kitchen votes',items:[{label:'Miso comet',value:8},{label:'Chili orbit',value:6},{label:'Mushroom moon',value:9}]}]]},
 {id:'demo-detective',title:'The missing museum moonstone',prompt:'Make a detective case board for a fictional museum mystery. Compare clues, choose a lead, and record a theory.',panels:[
 ['Metric',{title:'Time until sunrise',value:'04:30',detail:'Fictional case · the gallery opens at dawn'}],
 ['Table',{title:'Evidence board',columns:['Clue','Location','Next step'],rows:[['Silver thread','Skylight','Match fabric'],['Clock stopped','East hall','Check power'],['Wet footprints','Archive','Trace route']]}],
 ['Select',{title:'Follow a lead',field:'lead',options:['The skylight','The stopped clock','The archive']}],
 ['Checklist',{title:'Investigation',field:'checks',items:[{id:'camera',label:'Review camera timestamps'},{id:'guard',label:'Interview the night guard'},{id:'map',label:'Reconstruct the route'}]}],
 ['Input',{title:'Working theory',field:'theory',multiline:true,placeholder:'Connect the clues…'}],
 ['Text',{title:'Case briefing',body:'At 01:17, the moonstone vanished. No alarms. Three clues. One very nervous curator.\nAll characters and evidence are fictional.'}]]}
];
export function spec(demo){return {root:'root',elements:{root:{type:'Workspace',props:{title:demo.title},children:demo.panels.map((_,i)=>'p'+i)},...Object.fromEntries(demo.panels.map(([type,props],i)=>['p'+i,{type,props}]))}};}
