# Ability content data model

The current repository has authoritative profile data and `ability_catalog`, but it does not contain item, location, or NPC tables/RPCs. The input UI therefore does not invent those records.

Input rendering consumes data, not content-specific conditionals. An input can provide configured records through `options` or `entities` until a database source is available:

```json
{
  "type": "item",
  "key": "item_id",
  "label": "Item",
  "required": true,
  "options": [
    {
      "id": "tent",
      "name": "Tent",
      "value": 20,
      "min_level": 3,
      "active": true,
      "abilities": { "telegrab": true, "superheat": true }
    }
  ]
}
```

The service filters inactive records, minimum-level records, and declarative ability restrictions before the UI renders them. Adding a record does not require changing modal code.

## Recommended future tables

When these entities need to be managed independently of ability definitions, add separate authoritative tables rather than copying lists into frontend JavaScript:

- `grove_items`: stable `id`, `name`, `description`, `image`, `value`, `active`, `min_level`, and ability restriction data
- `grove_locations`: stable `id`, `name`, `description`, `image`, `active`
- `grove_npcs`: stable `id`, `name`, `description`, `image`, `active`, and any eligibility fields

Expose read-only authenticated RPCs or views for available records. The input schema should declare a source such as `items`, `locations`, or `npcs`; the service layer can then add one provider without changing the modal renderer. The cast RPC must validate submitted IDs and eligibility against those same authoritative tables before accepting a cast.