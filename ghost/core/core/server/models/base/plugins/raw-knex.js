const _ = require('lodash');
const debug = require('@tryghost/debug')('models:base:raw-knex');
const plugins = require('@tryghost/bookshelf-plugins');

const schema = require('../../../data/schema');

module.exports = function (Bookshelf) {
  Bookshelf.Model = Bookshelf.Model.extend({}, {
    raw_knex: {
      fetchAll: async function (options) {
        options = options || {};

        const nql = require('@tryghost/nql');
        const modelName = options.modelName;
        const tableNames = {
          Post: 'posts',
          User: 'users',
          Tag: 'tags'
        };
        const exclude = options.exclude;
        const filter = options.filter;
        const shouldHavePosts = options.shouldHavePosts;
        const withRelated = options.withRelated;
        const withRelatedFields = options.withRelatedFields;
        const relations = {
          tags: {
            targetTable: 'tags',
            name: 'tags',
            innerJoin: {
              relation: 'posts_tags',
              condition: ['posts_tags.tag_id', '=', 'tags.id']
            },
            select: ['posts_tags.post_id as post_id', 'tags.visibility'],
            whereIn: 'posts_tags.post_id',
            whereInKey: 'post_id',
            orderBy: 'sort_order'
          },
          authors: {
            targetTable: 'users',
            name: 'authors',
            innerJoin: {
              relation: 'posts_authors',
              condition: ['posts_authors.author_id', '=', 'users.id']
            },
            select: ['posts_authors.post_id as post_id'],
            whereIn: 'posts_authors.post_id',
            whereInKey: 'post_id',
            orderBy: 'sort_order'
          }
        };

        let query = Bookshelf.knex(tableNames[modelName]);

        if (options.offset) {
          query.offset(options.offset);
        }

        if (options.limit) {
          query.limit(options.limit);
        }

        if (exclude) {
          let toSelect = _.keys(schema.tables[tableNames[modelName]]);
          toSelect = toSelect.filter(key => !(key.startsWith('@@')));

          _.each(exclude, (key) => {
            if (toSelect.indexOf(key) !== -1) {
              toSelect.splice(toSelect.indexOf(key), 1);
            }
          });

          query.select(toSelect);
        }

        nql(filter).querySQL(query);

        if (shouldHavePosts) {
          plugins.hasPosts.addHasPostsWhere(tableNames[modelName], shouldHavePosts)(query);
        }

        if (options.id) {
          query.where({ id: options.id });
        }

        try {
          const objects = await query;

          debug('fetched', modelName, filter);

          if (!objects.length) {
            debug('No more entries found');
            return [];
          }

          let props = {};

          if (!withRelated) {
            return objects.map((object) => {
              object = Bookshelf.registry.models[modelName].prototype.toJSON.bind({
                attributes: object,
                related: function (key) {
                  return object[key];
                },
                serialize: Bookshelf.registry.models[modelName].prototype.serialize,
                formatsToJSON: Bookshelf.registry.models[modelName].prototype.formatsToJSON
              })();

              object = Bookshelf.registry.models[modelName].prototype.fixBools(object);
              object = Bookshelf.registry.models[modelName].prototype.fixDatesWhenFetch(object);
              return object;
            });
          }

          for (const withRelatedKey of withRelated) {
            const relation = relations[withRelatedKey];

            props[relation.name] = (async () => {
              debug('fetch withRelated', relation.name);

              let relationQuery = Bookshelf.knex(relation.targetTable);

              _.each(relation.select, (fieldToSelect) => {
                relationQuery.select(fieldToSelect);
              });

              _.each(withRelatedFields[withRelatedKey], (toSelect) => {
                relationQuery.select(toSelect);
              });

              relationQuery.innerJoin(
                relation.innerJoin.relation,
                relation.innerJoin.condition[0],
                relation.innerJoin.condition[1],
                relation.innerJoin.condition[2]
              );

              relationQuery.whereIn(relation.whereIn, objects.map(obj => obj.id));
              relationQuery.orderBy(relation.orderBy);

              const queryRelations = await relationQuery;

              debug('fetched withRelated', relation.name);

              const relationsToAttach = queryRelations.reduce((obj, item) => {
                if (!obj[item[relation.whereInKey]]) {
                  obj[item[relation.whereInKey]] = [];
                }

                obj[item[relation.whereInKey]].push(_.omit(item, relation.select));
                return obj;
              }, {});

              return relationsToAttach;
            })();
          }

          const relationsToAttach = await Promise.all(Object.values(props));

          debug('attach relations', modelName);

          objects.forEach((object) => {
            Object.keys(relationsToAttach).forEach((relation) => {
              if (!relationsToAttach[relation][object.id]) {
                object[relation] = [];
                return;
              }

              object[relation] = relationsToAttach[relation][object.id];
            });

            object = Bookshelf.registry.models[modelName].prototype.toJSON.bind({
              attributes: object,
              _originalOptions: {
                withRelated: Object.keys(relationsToAttach)
              },
              related: function (key) {
                return object[key];
              },
              serialize: Bookshelf.registry.models[modelName].prototype.serialize,
              formatsToJSON: Bookshelf.registry.models[modelName].prototype.formatsToJSON
            })();

            object = Bookshelf.registry.models[modelName].prototype.fixBools(object);
            object = Bookshelf.registry.models[modelName].prototype.fixDatesWhenFetch(object);
          });

          debug('attached relations', modelName);

          return objects;
        } catch (error) {
          console.error(error);
          throw error;
        }
      }
    }
  });
};
