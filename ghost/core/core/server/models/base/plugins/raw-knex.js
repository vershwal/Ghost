const _ = require('lodash');
const debug = require('@tryghost/debug')('models:base:raw-knex');
const plugins = require('@tryghost/bookshelf-plugins');

const schema = require('../../../data/schema');

/**
 * @param {import('bookshelf')} Bookshelf
 */
module.exports = function (Bookshelf) {
    Bookshelf.Model = Bookshelf.Model.extend({}, {
        raw_knex: {
            fetchAll: function (options) {
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

                return query.then((objects) => {
                    debug('fetched', modelName, filter);

                    if (!objects.length) {
                        debug('No more entries found');
                        return [];
                    }

                    if (!withRelated) {
                        return _.map(objects, (object) => {
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

                    const promises = _.map(withRelated, (withRelatedKey) => {
                        const relation = relations[withRelatedKey];

                        return Bookshelf.knex(relation.targetTable)
                            .select(relation.select)
                            .innerJoin(
                                relation.innerJoin.relation,
                                relation.innerJoin.condition[0],
                                relation.innerJoin.condition[1],
                                relation.innerJoin.condition[2]
                            )
                            .whereIn(relation.whereIn, _.map(objects, 'id'))
                            .orderBy(relation.orderBy)
                            .then((queryRelations) => {
                                debug('fetched withRelated', relation.name);

                                return queryRelations.reduce((obj, item) => {
                                    if (!obj[item[relation.whereInKey]]) {
                                        obj[item[relation.whereInKey]] = [];
                                    }

                                    obj[item[relation.whereInKey]].push(_.omit(item, relation.select));
                                    return obj;
                                }, {});
                            });
                    });

                    return Promise.all(promises)
                        .then((relationsToAttach) => {
                            debug('attach relations', modelName);

                            objects = _.map(objects, (object) => {
                                _.each(Object.keys(relationsToAttach), (relation) => {
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
                                return object;
                            });

                            debug('attached relations', modelName);

                            return objects;
                        });
                });
            }
        }
    });
};
